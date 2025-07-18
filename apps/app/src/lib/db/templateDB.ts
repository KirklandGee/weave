import Dexie, { Table } from 'dexie'

export interface TemplateInfo {
  name: string;
  description: string;
  required_vars: string[];
  optional_vars: string[];
  chain_type: string;
  metadata: {
    category: string;
    tags: string[];
    version: string;
  };
  updatedAt: number;
}

class TemplateDB extends Dexie {
  templates!: Table<TemplateInfo, string>

  constructor() {
    super('ai-rpg-templates')
    this.version(1).stores({
      templates: 'name, updatedAt, metadata.category'
    })
  }
}

const templateDB = new TemplateDB()

export { templateDB }