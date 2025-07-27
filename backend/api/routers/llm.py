from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends, Request
from fastapi.responses import StreamingResponse
from backend.services.llm.llm_service import call_llm
from backend.services.llm.template_manager import template_manager
from backend.models.schemas import ChatRequest, TemplateRequest, TemplateInfo, AsyncTemplateRequest
from backend.api.auth import get_current_user
from backend.services.queue_service import get_task_queue
from datetime import datetime

router = APIRouter(prefix="/llm", tags=["llm"])


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

@router.post("/template/{template_name}/async")
async def execute_template_async(
        template_name: str, 
        req: AsyncTemplateRequest, 
        queue = Depends(get_task_queue),
        user_id: str = Depends(get_current_user)):
    """Execute a template asynchronously and return immediately."""
    try:
        # Start background task for template execution
        task = queue.enqueue(
            execute_template_background,
            template_name,
            req.variables,
            req.context,
            req.note_id,
            req.campaign_slug,
            user_id,
            timeout=300
        )
        
        return {
            "task_id": task.id,
            "status": "started",
            "template_name": template_name,
            "note_id": req.note_id,
            "message": "Template execution started in background"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def execute_template_background(template_name: str, variables: dict, context: str, note_id: str, campaign_slug: str, user_id: str):
    """Background task to execute template and update tracking."""
    from rq import get_current_task
    import asyncio

    task = get_current_task()

    try:
        # Update task progress
        task.meta['progress'] = 10
        task.meta['current_step'] = 'Initializing template execution'
        task.meta['template_name'] = template_name
        task.meta['note_id'] = note_id
        task.save_meta()

        # Execute the template
        result = ""
                # Execute the async template in sync context
        async def run_template():
            result = ""
            task.meta['progress'] = 30
            task.meta['current_step'] = 'Processing template'
            task.save_meta()
            async for chunk in template_manager.execute_template(
                template_name=template_name,
                variables=variables,
                context=context,
                user_id=user_id,
                stream=False,
            ):
                result += chunk

            return result
        
        result = asyncio.run(run_template())

                # Final update
        task.meta['progress'] = 100
        task.meta['current_step'] = 'Completed'
        task.save_meta()
            
        return {
            "status": task.meta['current_step'],
            "result": result,
            "template_name": template_name,
            "note_id": note_id,
            "completed_at": datetime.now().isoformat()
        }
    
    except Exception as e:
        task.meta['progress'] = 100
        task.meta['current_step'] = 'Failed'
        task.meta['error'] = str(e)
        task.save_meta()
        
        print(f"Template {template_name} failed for note {note_id}: {str(e)}")
        raise  # RQ will mark task as failed

@router.get("/template/status/{task_id}")
async def get_template_status(
    task_id: str,
    queue = Depends(get_task_queue)
    ):

    """Get the status of an async template execution."""
    task = queue.fetch_task(task_id)
    
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")


    return {
        "task_id": task_id,
        "status": task.get_status(),  # 'queued', 'started', 'finished', 'failed'
        "progress": task.meta.get('progress', 0),
        "current_step": task.meta.get('current_step', 'Initializing'),
        "template_name": task.meta.get('template_name'),
        "note_id": task.meta.get('note_id'),
        "started_at": task.started_at.isoformat() if task.started_at else None,
        "completed_at": task.ended_at.isoformat() if task.ended_at else None,
        "result": task.result if task.is_finished else None,
        "error": task.meta.get('error') if task.is_failed else None
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
