import fs from 'fs/promises';
import path from 'path';

export async function readFile({ filepath }) {
  try {
    const data = await fs.readFile(filepath, 'utf8');
    return data;
  } catch (error) {
    return `Error reading file: ${error.message}`;
  }
}

export async function writeFile({ filepath, content }) {
  try {
    const dir = path.dirname(filepath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filepath, content, 'utf8');
    return `Successfully wrote to ${filepath}`;
  } catch (error) {
    return `Error writing file: ${error.message}`;
  }
}

export async function listDirectory({ dirPath }) {
  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    const result = files.map(file => {
      const type = file.isDirectory() ? 'DIR' : 'FILE';
      return `[${type}] ${file.name}`;
    });
    return result.join('\n');
  } catch (error) {
    return `Error listing directory: ${error.message}`;
  }
}

export async function createDirectory({ dirPath }) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    return `Successfully created directory ${dirPath}`;
  } catch (error) {
    return `Error creating directory: ${error.message}`;
  }
}

export const tools = [
  {
    type: 'function',
    function: {
      name: 'readFile',
      description: 'Reads the content of a file at the given path.',
      parameters: {
        type: 'object',
        properties: {
          filepath: {
            type: 'string',
            description: 'The absolute or relative path to the file.'
          }
        },
        required: ['filepath']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'writeFile',
      description: 'Writes content to a file. Creates the file and necessary directories if they do not exist.',
      parameters: {
        type: 'object',
        properties: {
          filepath: {
            type: 'string',
            description: 'The path to the file.'
          },
          content: {
            type: 'string',
            description: 'The string content to write to the file.'
          }
        },
        required: ['filepath', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'listDirectory',
      description: 'Lists the contents (files and folders) of a given directory.',
      parameters: {
        type: 'object',
        properties: {
          dirPath: {
            type: 'string',
            description: 'The path to the directory. Use "." for current directory.'
          }
        },
        required: ['dirPath']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'createDirectory',
      description: 'Creates a new directory along with any necessary parent directories.',
      parameters: {
        type: 'object',
        properties: {
          dirPath: {
            type: 'string',
            description: 'The path to the directory to create.'
          }
        },
        required: ['dirPath']
      }
    }
  }
];

export const functions = {
  readFile,
  writeFile,
  listDirectory,
  createDirectory
};