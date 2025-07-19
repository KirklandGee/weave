from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends, Request
from fastapi.responses import StreamingResponse
from backend.services.llm.llm_service import call_llm
from backend.services.llm.template_manager import template_manager
from backend.models.schemas import ChatRequest, TemplateRequest, TemplateInfo, AsyncTemplateRequest
from backend.api.auth import get_current_user
import asyncio
from datetime import datetime
from typing import Dict, Any
import uuid

router = APIRouter(prefix="/llm", tags=["llm"])

# In-memory tracking for async template executions
# In production, this should be stored in a database
async_tasks: Dict[str, Dict[str, Any]] = {}


@router.post("/chat/stream")
async def llm_chat_stream(req: ChatRequest, user_id: str = Depends(get_current_user)):
    try:
        print("Calling API")
        return StreamingResponse(
            call_llm(
                messages=req.messages,
                context=req.context,
                user_id=user_id,
                stream=True,
            ),
            media_type="text/plain",
        )
    except HTTPException:
        # Re-raise HTTP exceptions (like 429 for usage limits)
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/template/{template_name}/stream")
async def execute_template_stream(template_name: str, req: TemplateRequest, user_id: str = Depends(get_current_user)):
    """Execute a template with streaming response."""
    try:
        return StreamingResponse(
            template_manager.execute_template(
                template_name=template_name,
                variables=req.variables,
                context=req.context,
                user_id=user_id,
                stream=True,
            ),
            media_type="text/plain",
        )
    except HTTPException:
        # Re-raise HTTP exceptions (like 429 for usage limits)
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/template/{template_name}")
async def execute_template(template_name: str, req: TemplateRequest, user_id: str = Depends(get_current_user)):
    """Execute a template with non-streaming response."""
    try:
        result = ""
        async for chunk in template_manager.execute_template(
            template_name=template_name,
            variables=req.variables,
            context=req.context,
            user_id=user_id,
            stream=False,
        ):
            result += chunk
        
        return {
            "response": result,
            "template_name": template_name,
            "variables_used": req.variables
        }
    except HTTPException:
        # Re-raise HTTP exceptions (like 429 for usage limits)
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/template/{template_name}/async")
async def execute_template_async(template_name: str, req: AsyncTemplateRequest, background_tasks: BackgroundTasks, user_id: str = Depends(get_current_user)):
    """Execute a template asynchronously and return immediately."""
    try:
        # Generate unique task ID
        task_id = str(uuid.uuid4())
        
        # Initialize task tracking
        async_tasks[task_id] = {
            "status": "running",
            "template_name": template_name,
            "note_id": req.note_id,
            "campaign_slug": req.campaign_slug,
            "user_id": user_id,
            "started_at": datetime.now().isoformat(),
            "completed_at": None,
            "result": None,
            "error": None
        }
        
        # Start background task for template execution
        background_tasks.add_task(
            execute_template_background,
            task_id,
            template_name,
            req.variables,
            req.context,
            req.note_id,
            req.campaign_slug,
            user_id
        )
        
        return {
            "task_id": task_id,
            "status": "started",
            "template_name": template_name,
            "note_id": req.note_id,
            "message": "Template execution started in background"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def execute_template_background(task_id: str, template_name: str, variables: dict, context: str, note_id: str, campaign_slug: str, user_id: str):
    """Background task to execute template and update tracking."""
    try:
        # Execute the template
        result = ""
        async for chunk in template_manager.execute_template(
            template_name=template_name,
            variables=variables,
            context=context,
            user_id=user_id,
            stream=False,
        ):
            result += chunk
        
        # Update task tracking with success
        async_tasks[task_id].update({
            "status": "completed",
            "completed_at": datetime.now().isoformat(),
            "result": result
        })
        
        print(f"Template {template_name} completed successfully for note {note_id}")
        
    except Exception as e:
        # Update task tracking with error
        async_tasks[task_id].update({
            "status": "error",
            "completed_at": datetime.now().isoformat(),
            "error": str(e)
        })
        
        print(f"Template {template_name} failed for note {note_id}: {str(e)}")


@router.get("/template/status/{task_id}")
async def get_template_status(task_id: str):
    """Get the status of an async template execution."""
    if task_id not in async_tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task_info = async_tasks[task_id]
    
    # Return only the necessary information
    return {
        "task_id": task_id,
        "status": task_info["status"],
        "template_name": task_info["template_name"],
        "note_id": task_info["note_id"],
        "started_at": task_info["started_at"],
        "completed_at": task_info["completed_at"],
        "result": task_info["result"] if task_info["status"] == "completed" else None,
        "error": task_info["error"] if task_info["status"] == "error" else None
    }


@router.get("/templates")
async def list_templates():
    """List all available templates."""
    try:
        templates = template_manager.list_templates()
        return {"templates": templates}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/templates/{template_name}")
async def get_template_info(template_name: str) -> TemplateInfo:
    """Get information about a specific template."""
    try:
        template = template_manager.get_template(template_name)
        if not template:
            raise HTTPException(status_code=404, detail=f"Template '{template_name}' not found")
        
        return TemplateInfo(
            name=template.name,
            description=template.description,
            required_vars=template.required_vars,
            optional_vars=template.optional_vars,
            chain_type=template.chain_type,
            metadata=template.metadata
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/templates/reload")
async def reload_templates():
    """Reload all templates."""
    try:
        template_manager.reload_templates()
        return {"message": "Templates reloaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
