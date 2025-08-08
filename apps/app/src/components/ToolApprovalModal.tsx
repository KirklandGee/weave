import React, { useState } from 'react';
import { X, CheckCircle, Settings } from 'lucide-react';

interface ToolCall {
  id: string;
  name: string;
  description: string;
  args: Record<string, unknown>;
}

interface ToolApprovalModalProps {
  tools: ToolCall[];
  aiMessage?: string;
  onApprove: (approvedTools: ToolCall[]) => void;
  onDecline: () => void;
  isExecuting?: boolean;
}

export function ToolApprovalModal({ 
  tools, 
  aiMessage, 
  onApprove, 
  onDecline, 
  isExecuting = false 
}: ToolApprovalModalProps) {
  const [selectedTools, setSelectedTools] = useState<Set<string>>(
    new Set(tools.map(t => t.id))
  );

  const toggleTool = (toolId: string) => {
    const newSelected = new Set(selectedTools);
    if (newSelected.has(toolId)) {
      newSelected.delete(toolId);
    } else {
      newSelected.add(toolId);
    }
    setSelectedTools(newSelected);
  };

  const getToolIcon = (toolName: string) => {
    if (toolName.includes('create')) return '📝';
    if (toolName.includes('update')) return '✏️';
    if (toolName.includes('search')) return '🔍';
    return '🔧';
  };

  const getToolPreview = (tool: ToolCall) => {
    if (tool.name === 'create_campaign_note') {
      return `Create note: "${tool.args.title}" with ${tool.args.content?.length || 0} characters`;
    }
    if (tool.name === 'update_campaign_note') {
      return `Update note ID: ${tool.args.note_id} with new title: "${tool.args.title}"`;
    }
    if (tool.name === 'search_campaign_context') {
      return `Search for: "${tool.args.query}"`;
    }
    return tool.description;
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
      <div className="bg-zinc-900 rounded-lg shadow-2xl border border-zinc-700 w-full max-w-2xl max-h-[80vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-medium text-zinc-200">
              AI Action Approval
            </h3>
          </div>
          <button
            onClick={onDecline}
            disabled={isExecuting}
            className="flex items-center justify-center w-8 h-8 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* AI Message */}
        {aiMessage && (
          <div className="p-4 border-b border-zinc-800 bg-zinc-950">
            <div className="text-sm text-zinc-400 mb-2">AI Response:</div>
            <div className="text-zinc-300 text-sm leading-relaxed">
              {aiMessage}
            </div>
          </div>
        )}

        {/* Tool Selection */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          <div className="text-sm text-zinc-400 mb-3">
            The AI wants to perform these actions. Select which ones to approve:
          </div>
          
          {tools.map(tool => (
            <div key={tool.id} className="group">
              <label className="flex items-start gap-3 p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg border border-zinc-700 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={selectedTools.has(tool.id)}
                  onChange={() => toggleTool(tool.id)}
                  disabled={isExecuting}
                  className="mt-1 w-4 h-4 text-amber-600 bg-zinc-700 border-zinc-600 rounded focus:ring-amber-500 focus:ring-2 disabled:opacity-50"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">
                      {getToolIcon(tool.name)}
                    </span>
                    <span className="font-medium text-zinc-200">
                      {tool.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                  
                  <div className="text-sm text-zinc-400 mb-2">
                    {getToolPreview(tool)}
                  </div>
                  
                  {/* Expandable args details */}
                  <details className="group">
                    <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400">
                      View parameters...
                    </summary>
                    <pre className="text-xs text-zinc-500 mt-2 p-2 bg-zinc-900 rounded border border-zinc-700 overflow-x-auto">
                      {JSON.stringify(tool.args, null, 2)}
                    </pre>
                  </details>
                </div>
              </label>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center gap-3 p-4 border-t border-zinc-800">
          <div className="text-sm text-zinc-400">
            {selectedTools.size} of {tools.length} actions selected
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onDecline}
              disabled={isExecuting}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
            >
              Decline All
            </button>
            
            <button
              onClick={() => {
                const approvedTools = tools.filter(t => selectedTools.has(t.id));
                onApprove(approvedTools);
              }}
              disabled={selectedTools.size === 0 || isExecuting}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-zinc-600 text-white rounded-md transition-colors disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isExecuting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  Approve {selectedTools.size > 0 ? `(${selectedTools.size})` : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}