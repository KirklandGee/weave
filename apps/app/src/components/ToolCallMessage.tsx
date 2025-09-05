import React from 'react';
import { Settings, Database, Search, FileText } from 'lucide-react';

interface ToolCallMessageProps {
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
}

// Map tool names to more readable displays
const TOOL_DISPLAY_MAP: Record<string, { icon: React.ComponentType<any>, name: string }> = {
  'search_campaign_nodes': { icon: Search, name: 'Search Campaign' },
  'get_node_details': { icon: FileText, name: 'Get Node Details' },
  'get_relationships': { icon: Database, name: 'Get Relationships' },
  'search_relationships': { icon: Database, name: 'Search Relationships' },
};

export default function ToolCallMessage({ toolName, args, result }: ToolCallMessageProps) {
  const toolDisplay = TOOL_DISPLAY_MAP[toolName] || { icon: Settings, name: toolName };
  const IconComponent = toolDisplay.icon;

  // Format arguments for display
  const formatArgs = (args: Record<string, unknown>): string => {
    const entries = Object.entries(args);
    if (entries.length === 0) return '';
    
    return entries.map(([key, value]) => {
      if (typeof value === 'string' && value.length > 30) {
        return `${key}: "${value.substring(0, 30)}..."`;
      }
      return `${key}: ${JSON.stringify(value)}`;
    }).join(', ');
  };

  // Format result for display
  const formatResult = (result: unknown): string => {
    if (!result) return '';
    
    if (Array.isArray(result)) {
      return `Found ${result.length} items`;
    }
    
    if (typeof result === 'object') {
      const keys = Object.keys(result as Record<string, unknown>);
      return `Returned object with ${keys.length} fields`;
    }
    
    const resultStr = String(result);
    if (resultStr.length > 100) {
      return resultStr.substring(0, 100) + '...';
    }
    
    return resultStr;
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-900/10 border border-blue-700/20">
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-blue-700/20 text-blue-400">
        <IconComponent size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-blue-400">🔧 {toolDisplay.name}</span>
          {!result && (
            <span className="text-xs px-2 py-0.5 bg-blue-700/30 text-blue-300 rounded">
              Running...
            </span>
          )}
        </div>
        
        {/* Arguments */}
        {Object.keys(args).length > 0 && (
          <div className="text-xs text-blue-200/70 mb-1">
            <span className="font-mono bg-blue-950/30 px-1 rounded">
              {formatArgs(args)}
            </span>
          </div>
        )}
        
        {/* Result */}
        {result && (
          <div className="text-xs text-blue-200/90">
            <span className="text-blue-400">→</span> {formatResult(result)}
          </div>
        )}
      </div>
    </div>
  );
}