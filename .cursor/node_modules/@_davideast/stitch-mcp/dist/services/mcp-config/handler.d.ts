import { type McpConfigService, type GenerateConfigInput, type McpConfigResult } from './spec.js';
export declare class McpConfigHandler implements McpConfigService {
    generateConfig(input: GenerateConfigInput): Promise<McpConfigResult>;
    private generateHttpConfig;
    private generateCursorConfig;
    private generateAntigravityConfig;
    private generateVSCodeConfig;
    private generateClaudeCodeConfig;
    private generateGeminiCliConfig;
    private generateOpencodeConfig;
    private generateStdioConfig;
    private getInstructionsForClient;
}
