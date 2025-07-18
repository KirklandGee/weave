import { templateDB, TemplateInfo } from '@/lib/db/templateDB'

export class TemplateService {
  private static instance: TemplateService | null = null;
  private lastSync: number = 0;
  private syncInterval: number = 1000 * 60 * 30; // 30 minutes

  static getInstance(): TemplateService {
    if (!TemplateService.instance) {
      TemplateService.instance = new TemplateService();
    }
    return TemplateService.instance;
  }

  async executeTemplate(
    templateName: string,
    variables: Record<string, string>,
    context: string,
    authFetch: (url: string, options?: RequestInit) => Promise<Response>
  ): Promise<{ response: string; template_name: string; variables_used: Record<string, string> }> {
    try {
      const response = await authFetch(`/api/llm/template/${templateName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variables,
          context,
          metadata: {}
        }),
      });

      if (!response.ok) {
        throw new Error(`Template execution failed: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Template execution error:', error);
      throw error;
    }
  }

  async getAllTemplates(): Promise<TemplateInfo[]> {
    return await templateDB.templates.orderBy('name').toArray();
  }

  async getTemplate(name: string): Promise<TemplateInfo | undefined> {
    return await templateDB.templates.get(name);
  }

  async syncTemplates(authFetch: (url: string, options?: RequestInit) => Promise<Response>): Promise<void> {
    try {
      // Fetch list of available templates
      const templatesResponse = await authFetch('/api/llm/templates');
      if (!templatesResponse.ok) {
        throw new Error(`Failed to fetch templates list: ${templatesResponse.status}`);
      }
      
      const templatesData = await templatesResponse.json();
      console.log('Templates API response:', templatesData);
      
      // Handle different possible response formats
      let templateNames: string[] = [];
      if (templatesData.templates && Array.isArray(templatesData.templates)) {
        templateNames = templatesData.templates;
      } else if (Array.isArray(templatesData)) {
        templateNames = templatesData;
      } else if (templatesData.templates && typeof templatesData.templates === 'object') {
        // Handle object format: {templates: {name: description, ...}}
        templateNames = Object.keys(templatesData.templates);
      } else {
        console.error('Unexpected templates response format:', templatesData);
        throw new Error('Invalid response format from templates endpoint');
      }
      
      console.log('Template names:', templateNames);
      
      // Fetch details for each template
      const templatePromises = templateNames.map(async (name) => {
        try {
          const templateResponse = await authFetch(`/api/llm/templates/${name}`);
          if (!templateResponse.ok) {
            console.warn(`Failed to fetch template ${name}: ${templateResponse.status}`);
            return null;
          }
          const templateData = await templateResponse.json();
          return {
            ...templateData,
            updatedAt: Date.now()
          } as TemplateInfo;
        } catch (error) {
          console.error(`Error fetching template ${name}:`, error);
          return null;
        }
      });

      const templates = (await Promise.all(templatePromises)).filter(Boolean) as TemplateInfo[];
      
      // Update local cache
      await templateDB.transaction('rw', templateDB.templates, async () => {
        await templateDB.templates.clear();
        await templateDB.templates.bulkAdd(templates);
      });

      this.lastSync = Date.now();
      console.log(`Synced ${templates.length} templates`);
    } catch (error) {
      console.error('Failed to sync templates:', error);
      throw error;
    }
  }

  async syncIfNeeded(authFetch: (url: string, options?: RequestInit) => Promise<Response>): Promise<void> {
    const now = Date.now();
    if (now - this.lastSync > this.syncInterval) {
      await this.syncTemplates(authFetch);
    }
  }

  async initializeTemplates(authFetch: (url: string, options?: RequestInit) => Promise<Response>): Promise<void> {
    const existingTemplates = await this.getAllTemplates();
    if (existingTemplates.length === 0) {
      await this.syncTemplates(authFetch);
    } else {
      // Sync in background if needed
      this.syncIfNeeded(authFetch).catch(console.error);
    }
  }
}

export const templateService = TemplateService.getInstance();