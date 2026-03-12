import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function test() {
  const transport = new StdioClientTransport({
    command: 'osmaps-mcp',
    args: []
  });

  const client = new Client({
    name: 'test-client',
    version: '1.0.0'
  }, { capabilities: {} });

  await client.connect(transport);

  const result = await client.callTool({
    name: 'get-route-distance',
    arguments: {
      origin: 'Berlin, Germany',
      destination: 'Paris, France'
    }
  });

  console.log('Result:', result.content[0].text);
  await client.close();
}

test();
