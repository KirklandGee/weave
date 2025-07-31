import os
import importlib.util
from typing import Dict, Any
from pathlib import Path
from .types import TemplateConfig


class PromptRegistry:
    """Registry for discovering and loading prompt templates."""
    
    def __init__(self):
        self.prompts_dir = Path(__file__).parent / "prompts"
    
    def load_all_templates(self) -> Dict[str, TemplateConfig]:
        """Load all template configurations from the prompts directory."""
        templates = {}
        
        if not self.prompts_dir.exists():
            return templates
        
        for file_path in self.prompts_dir.glob("*.py"):
            if file_path.name.startswith("__"):
                continue
            
            try:
                template_config = self._load_template_from_file(file_path)
                if template_config:
                    templates[template_config.name] = template_config
            except Exception as e:
                print(f"Error loading template from {file_path}: {e}")
        
        return templates
    
    def _load_template_from_file(self, file_path: Path) -> TemplateConfig | None:
        """Load a template configuration from a Python file."""
        # Load the module
        spec = importlib.util.spec_from_file_location(file_path.stem, file_path)
        if not spec or not spec.loader:
            return None
        
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        
        # Look for template_config in the module
        if hasattr(module, 'template_config'):
            config_data = module.template_config
            
            # If it's already a TemplateConfig instance, return it
            if isinstance(config_data, TemplateConfig):
                return config_data
            
            # If it's a dict, convert to TemplateConfig
            if isinstance(config_data, dict):
                return TemplateConfig(**config_data)
        
        # Look for individual components (legacy support)
        if hasattr(module, 'system_message') and hasattr(module, 'user_message'):
            from langchain_core.prompts import PromptTemplate
            
            # Create a combined template from system and user messages
            template_str = f"{module.system_message}\n\n{module.user_message}"
            template = PromptTemplate.from_template(template_str)
            
            return TemplateConfig(
                name=file_path.stem,
                description=f"Template from {file_path.stem}",
                template=template,
                system_message=getattr(module, 'system_message', None)
            )
        
        return None
    
    def get_template_info(self, template_name: str) -> Dict[str, Any] | None:
        """Get information about a specific template."""
        file_path = self.prompts_dir / f"{template_name}.py"
        
        if not file_path.exists():
            return None
        
        try:
            template_config = self._load_template_from_file(file_path)
            if template_config:
                return {
                    "name": template_config.name,
                    "description": template_config.description,
                    "required_vars": template_config.required_vars,
                    "optional_vars": template_config.optional_vars,
                    "chain_type": template_config.chain_type,
                    "metadata": template_config.metadata
                }
        except Exception as e:
            print(f"Error getting template info for {template_name}: {e}")
        
        return None
    
    def reload_template(self, template_name: str) -> TemplateConfig | None:
        """Reload a specific template."""
        file_path = self.prompts_dir / f"{template_name}.py"
        
        if not file_path.exists():
            return None
        
        try:
            return self._load_template_from_file(file_path)
        except Exception as e:
            print(f"Error reloading template {template_name}: {e}")
            return None