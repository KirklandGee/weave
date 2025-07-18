from typing import Dict, Any, Optional, AsyncGenerator, List
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from langchain.schema import BaseMessage
from backend.models.schemas import LLMMessage
from .llm_service import call_llm
from .types import ChainStep
from backend.logging.trace import traced


class ChainBuilder:
    """Builder for creating and executing LangChain chains."""
    
    def __init__(self):
        pass
    
    def build_chain(self, template_config, variables: Dict[str, Any]) -> List[ChainStep]:
        """Build a chain from a template configuration."""
        # Check if the template has chain steps defined
        if hasattr(template_config, 'chain_steps') and template_config.chain_steps:
            return self._build_multi_step_chain(template_config, variables)
        else:
            # Single step chain
            return [ChainStep(
                name=template_config.name,
                template=template_config.template,
                output_key="result",
                system_message=template_config.system_message,
                depends_on=[]
            )]
    
    def _build_multi_step_chain(self, template_config, variables: Dict[str, Any]) -> List[ChainStep]:
        """Build a multi-step chain from configuration."""
        chain_steps = []
        
        for step_config in template_config.chain_steps:
            step = ChainStep(
                name=step_config.get("name"),
                template=step_config.get("template"),
                output_key=step_config.get("output_key"),
                system_message=step_config.get("system_message"),
                depends_on=step_config.get("depends_on", [])
            )
            chain_steps.append(step)
        
        return chain_steps
    
    @traced("chain_execution")
    async def execute_chain(
        self, 
        chain_steps: List[ChainStep], 
        variables: Dict[str, Any],
        context: str = "",
        user_id: Optional[str] = None,
        stream: bool = True,
        **llm_overrides
    ) -> AsyncGenerator[str, None]:
        """Execute a chain of steps."""
        step_results = variables.copy()
        
        for i, step in enumerate(chain_steps):
            # Check dependencies
            for dependency in step.depends_on:
                if dependency not in step_results:
                    raise ValueError(f"Step '{step.name}' depends on '{dependency}' which is not available")
            
            # Execute the step
            step_output = ""
            async for chunk in self._execute_step(
                step, step_results, context, user_id, stream, **llm_overrides
            ):
                step_output += chunk
                
                # For the last step, yield the output for streaming
                if i == len(chain_steps) - 1:
                    yield chunk
            
            # Store the result for subsequent steps
            step_results[step.output_key] = step_output.strip()
    
    async def _execute_step(
        self, 
        step: ChainStep, 
        variables: Dict[str, Any],
        context: str,
        user_id: Optional[str],
        stream: bool,
        **llm_overrides
    ) -> AsyncGenerator[str, None]:
        """Execute a single step in the chain."""
        try:
            # Format the prompt with current variables
            formatted_prompt = step.template.format(**variables)
            
            # Create message list
            messages = []
            if step.system_message:
                messages.append(LLMMessage(role="system", content=step.system_message))
            
            messages.append(LLMMessage(role="human", content=formatted_prompt))
            
            # Call the existing LLM service
            async for chunk in call_llm(
                messages=messages,
                context=context,
                user_id=user_id,
                stream=stream,
                **llm_overrides
            ):
                yield chunk
        
        except Exception as e:
            error_msg = f"Error in chain step '{step.name}': {str(e)}"
            print(error_msg)
            yield error_msg
    
    def validate_chain(self, chain_steps: List[ChainStep]) -> bool:
        """Validate that a chain is properly structured."""
        step_names = {step.name for step in chain_steps}
        output_keys = {step.output_key for step in chain_steps}
        
        # Check that all dependencies are satisfied
        for step in chain_steps:
            for dependency in step.depends_on:
                if dependency not in output_keys and dependency not in step_names:
                    print(f"Warning: Step '{step.name}' depends on '{dependency}' which is not produced by any step")
                    return False
        
        return True