import React, { useState, useRef, useEffect } from 'react';
import { ChatRequest, LLMMessage, LLMChatEmbeddedProps } from '@/types/llm';
import { Rnd } from 'react-rnd';
import { useLLMContext } from '@/lib/hooks/useLLMContext';
import { useTemplateContext } from '@/lib/hooks/useTemplateContext';
import { useAuthFetch } from '@/utils/authFetch.client';
import { useTemplates } from '@/contexts/AppContext';
import { useCampaign } from '@/contexts/AppContext';
import { useTemplateGeneration } from '@/lib/hooks/useTemplateGeneration';
import { Trash2, X, Zap } from 'lucide-react';
import { TemplateInfo } from '@/lib/db/templateDB';
import { createNodeOps } from '@/lib/hooks/useNodeOps';
import { USER_ID } from '@/lib/constants';
import { nanoid } from 'nanoid';
// import { useToast } from '@/lib/hooks/useToast';

export default function LLMChatEmbedded({
  title = 'AI Assistant',
  placeholder = 'Ask me anything...',
  campaign,
  activeNodeId,
  isOpen = false,
  onToggle
}: LLMChatEmbeddedProps) {

  const contextString = useLLMContext(campaign, activeNodeId)
  const templateContextString = useTemplateContext(campaign, activeNodeId)
  const { templates, loading: templatesLoading, error: templatesError } = useTemplates()
  const { currentCampaign } = useCampaign()
  const { startPolling } = useTemplateGeneration(campaign)
  // const { toast } = useToast()
  const [messages, setMessages] = useState<LLMMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateInfo | null>(null);
  const [templateInputs, setTemplateInputs] = useState<Record<string, string>>({});
  const [isExecutingTemplate, setIsExecutingTemplate] = useState(false);

  // state for position & size
  const [panelPos, setPanelPos] = useState({ x: 100, y: 100 });
  const [panelSize, setPanelSize] = useState({ width: 400, height: 500 });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const authFetch = useAuthFetch();

  // initialize position at bottom-right on first open
  useEffect(() => {
    if (!isOpen) return;
    const margin = 16;
    // Get parent container dimensions instead of window
    const parentEl = document.querySelector('main');
    if (parentEl) {
      const parentRect = parentEl.getBoundingClientRect();
      const x = parentRect.width - panelSize.width - margin;
      const y = parentRect.height - panelSize.height - margin - 60; // space for toggle button area
      setPanelPos({ x, y });
    }
  }, [isOpen, panelSize.width, panelSize.height]);

  // scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: LLMMessage = { role: 'human', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {


      const chatRequest: ChatRequest = {
        user_id: 'demo-user',
        messages: [...messages, userMessage],
        metadata: {},
        context: contextString,
      };

      const response = await authFetch('/api/llm/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatRequest),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      let accumulated = '';
      setMessages(prev => [...prev, { role: 'ai', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = new TextDecoder().decode(value);
        accumulated += chunk;
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: 'ai', content: accumulated };
          return copy;
        });
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'ai', content: 'Error processing request, please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => setMessages([]);

  const handleTemplateSelect = (template: TemplateInfo) => {
    setSelectedTemplate(template);
    setShowTemplates(false);
    // Initialize template inputs
    const initialInputs: Record<string, string> = {};
    [...template.required_vars, ...template.optional_vars].forEach(varName => {
      // Auto-populate context variable with enhanced template context
      if (varName === 'context') {
        initialInputs[varName] = templateContextString;
      } else {
        initialInputs[varName] = '';
      }
    });
    setTemplateInputs(initialInputs);
  };

  const handleTemplateSubmit = async () => {
    if (!selectedTemplate || !currentCampaign) return;
    
    // Check if all required variables are filled (excluding context which is auto-populated)
    const missingRequired = selectedTemplate.required_vars.filter(varName => 
      varName !== 'context' && (!templateInputs[varName] || !templateInputs[varName].trim())
    );
    
    if (missingRequired.length > 0) {
      alert(`Please fill in all required fields: ${missingRequired.join(', ')}`);
      return;
    }
    
    setIsExecutingTemplate(true);
    
    try {
      // Prepare variables for the template
      const variables: Record<string, string> = {};
      selectedTemplate.required_vars.forEach(varName => {
        if (varName === 'context') {
          variables[varName] = templateContextString;
        } else {
          variables[varName] = templateInputs[varName] || '';
        }
      });
      selectedTemplate.optional_vars.forEach(varName => {
        if (varName === 'context') {
          variables[varName] = templateContextString;
        } else if (templateInputs[varName]) {
          variables[varName] = templateInputs[varName];
        }
      });
      
      // Create a placeholder note immediately
      const nodeOps = createNodeOps(currentCampaign.slug);
      const ts = Date.now();
      const id = nanoid();
      
      // Call async endpoint first to get task ID
      const asyncResponse = await authFetch(`/api/llm/template/${selectedTemplate.name}/async`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variables,
          context: contextString,
          metadata: {},
          note_id: id,
          campaign_slug: currentCampaign.slug
        }),
      });
      
      if (!asyncResponse.ok) {
        throw new Error(`Async template execution failed: ${asyncResponse.status}`);
      }
      
      const asyncResult = await asyncResponse.json();
      
      // Get the first non-context user input for the title
      const firstUserInput = selectedTemplate.required_vars
        .filter(varName => varName !== 'context')
        .concat(selectedTemplate.optional_vars.filter(varName => varName !== 'context'))
        .map(varName => variables[varName])
        .find(value => value && value.trim())

      // Create a truncated version of the first input (max 50 characters)
      const truncatedInput = firstUserInput 
        ? firstUserInput.length > 50 
          ? firstUserInput.substring(0, 50) + '...'
          : firstUserInput
        : 'Generating...'

      // Create placeholder note with task ID
      const placeholderNote = {
        id,
        type: 'Note',
        title: `${truncatedInput} - Generating...`,
        markdown: `# ${selectedTemplate.name} Template\n\n*Generating content...*\n\nPlease wait while the AI generates your content based on the template.`,
        updatedAt: ts,
        createdAt: ts,
        attributes: {
          generation_status: 'generating',
          generation_started_at: ts,
          generation_task_id: asyncResult.task_id,
          template_name: selectedTemplate.name,
          template_variables: variables
        },
        ownerId: USER_ID,
        campaignId: currentCampaign.id,
        campaignIds: [currentCampaign.id]
      };
      
      await nodeOps.createNode(placeholderNote);
      
      // Start polling for this template generation
      startPolling(asyncResult.task_id, id);
      
      // Close the modal
      setSelectedTemplate(null);
      setTemplateInputs({});
      
      // No more alert - the user will see the generating note in the sidebar
      
    } catch (error) {
      console.error('Template execution error:', error);
      alert(`Template execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExecutingTemplate(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedTemplate(null);
    setTemplateInputs({});
  };

  return (
    <>
      {/* Chat Panel */}
      {isOpen && (
        <Rnd
          size={{ width: panelSize.width, height: panelSize.height }}
          position={{ x: panelPos.x, y: panelPos.y }}
          bounds="parent"
          onDragStop={(_, d) => setPanelPos({ x: d.x, y: d.y })}
          onResizeStop={(_e, _dir, ref, _delta, pos) => {
            setPanelSize({ width: ref.offsetWidth, height: ref.offsetHeight });
            setPanelPos(pos);
          }}
          dragHandleClassName="chat-drag-handle"
          className="bg-zinc-900 text-zinc-200 rounded-lg shadow-2xl border border-zinc-800 overflow-hidden z-50 absolute"
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="chat-drag-handle flex items-center justify-between p-3 border-b border-zinc-800 bg-zinc-900 cursor-move flex-shrink-0">
              <h4 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">{title}</h4>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="flex items-center justify-center w-7 h-7 text-zinc-400 hover:text-amber-400 hover:bg-amber-900/20 rounded-md transition-colors"
                  title="Template Shortcuts"
                >
                  <Zap size={14} />
                </button>
                <button 
                  onClick={clearChat}
                  className="flex items-center justify-center w-7 h-7 text-zinc-400 hover:text-red-400 hover:bg-red-900/20 rounded-md transition-colors"
                  title="Clear Chat History"
                >
                  <Trash2 size={14} />
                </button>
                <button 
                  onClick={onToggle}
                  className="flex items-center justify-center w-7 h-7 text-zinc-400 hover:text-zinc-200 rounded-md transition-colors"
                  title="Close AI Assistant"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Template Shortcuts Dropdown */}
            {showTemplates && (
              <div className="border-b border-zinc-800 bg-zinc-900 p-3 flex-shrink-0">
                <div className="space-y-2">
                  <h5 className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Template Shortcuts</h5>
                  
                  {templatesError && (
                    <div className="text-xs text-red-400 p-2 bg-red-900/20 rounded-md">
                      Error: {templatesError}
                    </div>
                  )}
                  
                  <div className="max-h-60 overflow-y-auto">
                    <div className="grid gap-2">
                      {templatesLoading ? (
                        <div className="text-xs text-zinc-400 p-2 text-center">Loading templates...</div>
                      ) : templates.length === 0 ? (
                        <div className="text-xs text-zinc-400 p-2 text-center">No templates available</div>
                      ) : (
                        templates.map((template) => (
                          <button
                            key={template.name}
                            onClick={() => handleTemplateSelect(template)}
                            className="flex flex-col items-start p-2 text-left bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors"
                          >
                            <div className="font-medium text-zinc-200 text-sm capitalize">{template.name}</div>
                            <div className="text-xs text-zinc-400 mt-1">{template.description}</div>
                            {template.required_vars.length > 0 && (
                              <div className="text-xs text-amber-400 mt-1">
                                Required: {template.required_vars.join(', ')}
                              </div>
                            )}
                            {template.metadata.category && (
                              <div className="text-xs text-zinc-500 mt-1">
                                Category: {template.metadata.category}
                              </div>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-zinc-950"
              onWheel={(e) => {
                e.stopPropagation();
              }}
            >
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-zinc-500 text-base">Ask me anything about your campaign!</p>
                </div>
              )}
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'human' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] p-4 rounded-lg text-base leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'human' 
                        ? 'bg-amber-600 text-white' 
                        : 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                    }`}
                  >
                    {msg.content}
                    {msg.role === 'ai' && idx === messages.length - 1 && isLoading && (
                      <span className="inline-block w-2 h-5 bg-zinc-400 animate-pulse ml-1">▋</span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-zinc-800 p-3 bg-zinc-900 flex-shrink-0">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={placeholder}
                  disabled={isLoading}
                  className="flex-1 px-3 py-2 text-sm bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50 placeholder-zinc-500"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-700 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-md disabled:cursor-not-allowed transition-colors border border-amber-500 hover:border-amber-400"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-zinc-300 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Send'
                  )}
                </button>
              </form>
            </div>
          </div>
        </Rnd>
      )}

      {/* Template Configuration Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-zinc-900 rounded-lg shadow-2xl border border-zinc-800 w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h3 className="text-lg font-medium text-zinc-200 capitalize">
                {selectedTemplate.name} Template
              </h3>
              <button
                title='close template'
                onClick={handleCloseModal}
                className="flex items-center justify-center w-8 h-8 text-zinc-400 hover:text-zinc-200 rounded-md transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <p className="text-sm text-zinc-400">{selectedTemplate.description}</p>
              
              <div className="space-y-3">
                {selectedTemplate.required_vars.filter(varName => varName !== 'context').map((varName) => (
                  <div key={varName}>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">
                      {varName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} *
                    </label>
                    {varName === 'note_content' || varName === 'related_notes' ? (
                      <textarea
                        value={templateInputs[varName] || ''}
                        onChange={(e) => setTemplateInputs(prev => ({
                          ...prev,
                          [varName]: e.target.value
                        }))}
                        className="w-full px-3 py-2 bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 placeholder-zinc-500"
                        rows={3}
                        placeholder={`Enter ${varName.replace(/_/g, ' ')}...`}
                      />
                    ) : (
                      <input
                        type="text"
                        value={templateInputs[varName] || ''}
                        onChange={(e) => setTemplateInputs(prev => ({
                          ...prev,
                          [varName]: e.target.value
                        }))}
                        className="w-full px-3 py-2 bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 placeholder-zinc-500"
                        placeholder={`Enter ${varName.replace(/_/g, ' ')}...`}
                      />
                    )}
                  </div>
                ))}
                
                {selectedTemplate.optional_vars.filter(varName => varName !== 'context').length > 0 && (
                  <>
                    <div className="border-t border-zinc-800 pt-3">
                      <h4 className="text-sm font-medium text-zinc-400 mb-2">Optional Fields</h4>
                    </div>
                    {selectedTemplate.optional_vars.filter(varName => varName !== 'context').map((varName) => (
                      <div key={varName}>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">
                          {varName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </label>
                        {varName === 'related_notes' ? (
                          <textarea
                            value={templateInputs[varName] || ''}
                            onChange={(e) => setTemplateInputs(prev => ({
                              ...prev,
                              [varName]: e.target.value
                            }))}
                            className="w-full px-3 py-2 bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 placeholder-zinc-500"
                            rows={3}
                            placeholder={`Enter ${varName.replace(/_/g, ' ')}...`}
                          />
                        ) : (
                          <input
                            type="text"
                            value={templateInputs[varName] || ''}
                            onChange={(e) => setTemplateInputs(prev => ({
                              ...prev,
                              [varName]: e.target.value
                            }))}
                            className="w-full px-3 py-2 bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 placeholder-zinc-500"
                            placeholder={`Enter ${varName.replace(/_/g, ' ')}...`}
                          />
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-2 p-4 border-t border-zinc-800">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTemplateSubmit}
                disabled={isExecutingTemplate}
                className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-700 disabled:bg-zinc-600 disabled:cursor-not-allowed text-white rounded-md transition-colors border border-amber-500 hover:border-amber-400"
              >
                {isExecutingTemplate ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating Note...
                  </div>
                ) : (
                  'Execute Template'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}