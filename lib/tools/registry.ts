import { ToolDefinition } from "./definitions/tool-interface";

class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();
  private initialized: boolean = false;

  register(tool: ToolDefinition): void {
    this.tools.set(tool.id, tool);
  }

  get(id: string): ToolDefinition | undefined {
    return this.tools.get(id);
  }

  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  getAllByType(type: string): ToolDefinition[] {
    return this.getAll().filter((tool) => tool.type === type);
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  setInitialized(value: boolean): void {
    this.initialized = value;
  }
}

// Create and export a singleton instance
export const toolRegistry = new ToolRegistry();
