from typing import Dict, Any, Optional, AsyncGenerator
from langchain.schema import BaseMessage
from backend.models.schemas import LLMMessage
from .llm_service import call_llm
from .types import TemplateConfig
from backend.observability.trace import traced

# Import these at the class level to avoid circular imports
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from .prompt_registry import PromptRegistry
    from .chain_builder import ChainBuilder


class TemplateManager:
    """Central manager for prompt templates and chain execution."""
    
    def __init__(self):
        from .prompt_registry import PromptRegistry
        from .chain_builder import ChainBuilder
        
        self.registry = PromptRegistry()
        self.chain_builder = ChainBuilder()
        self.templates: Dict[str, TemplateConfig] = {}
        self._load_templates()
    
    def _load_templates(self):
        """Load all available templates from the registry."""
        self.templates = self.registry.load_all_templates()
    
    def get_template(self, name: str) -> Optional[TemplateConfig]:
        """Get a template by name."""
        return self.templates.get(name)
    
    def list_templates(self) -> Dict[str, str]:
        """List all available templates with their descriptions."""
        return {name: config.description for name, config in self.templates.items()}
    
    def validate_variables(self, template_name: str, variables: Dict[str, Any]) -> Dict[str, Any]:
        """Validate that required variables are present and return validated variables."""
        template = self.get_template(template_name)
        if not template:
            raise ValueError(f"Template '{template_name}' not found")
        
        # Check required variables
        missing_vars = set(template.required_vars) - set(variables.keys())
        if missing_vars:
            raise ValueError(f"Missing required variables: {missing_vars}")
        
        # Start with all provided variables that are valid
        valid_vars = set(template.required_vars + template.optional_vars)
        filtered_vars = {k: v for k, v in variables.items() if k in valid_vars}
        
        # Pre-populate missing optional variables with empty strings
        # This prevents KeyError when formatting templates with missing optional vars
        for optional_var in template.optional_vars:
            if optional_var not in filtered_vars:
                filtered_vars[optional_var] = ""
        
        return filtered_vars
    
    @traced("template_execution")
    async def execute_template(
        self, 
        template_name: str, 
        variables: Dict[str, Any],
        context: str = "",
        user_id: Optional[str] = None,
        stream: bool = True,
        **llm_overrides
    ) -> AsyncGenerator[str, None]:
        """Execute a template with the given variables."""
        template = self.get_template(template_name)
        if not template:
            raise ValueError(f"Template '{template_name}' not found")
        
        # Validate variables
        validated_vars = self.validate_variables(template_name, variables)
        
        if template.chain_type == "single":
            # Single template execution
            async for chunk in self._execute_single_template(
                template, validated_vars, context, user_id, stream, **llm_overrides
            ):
                yield chunk
        else:
            # Multi-step chain execution
            async for chunk in self._execute_chain_template(
                template, validated_vars, context, user_id, stream, **llm_overrides
            ):
                yield chunk
    
    async def _execute_single_template(
        self, 
        template: TemplateConfig, 
        variables: Dict[str, Any],
        context: str,
        user_id: Optional[str],
        stream: bool,
        **llm_overrides
    ) -> AsyncGenerator[str, None]:
        """Execute a single template."""
        # Format the prompt with variables
        formatted_prompt = template.template.format(**variables)
        
        # Create message list
        messages = []
        if template.system_message:
            messages.append(LLMMessage(role="system", content=template.system_message))
        
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
    
    async def _execute_chain_template(
        self, 
        template: TemplateConfig, 
        variables: Dict[str, Any],
        context: str,
        user_id: Optional[str],
        stream: bool,
        **llm_overrides
    ) -> AsyncGenerator[str, None]:
        """Execute a multi-step chain template."""
        # Use the chain builder to create and execute the chain
        chain = self.chain_builder.build_chain(template, variables)
        
        async for chunk in self.chain_builder.execute_chain(
            chain, variables, context, user_id, stream, **llm_overrides
        ):
            yield chunk
    
    def reload_templates(self):
        """Reload all templates from the registry."""
        self._load_templates()


# Global instance
template_manager = TemplateManager()