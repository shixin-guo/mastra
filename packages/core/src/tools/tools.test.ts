import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';

import { createTool } from './tool';

const mockFindUser = vi.fn().mockImplementation(async nameS => {
  const list = [
    { name: 'Dero Israel', email: 'dero@mail.com' },
    { name: 'Ife Dayo', email: 'dayo@mail.com' },
    { name: 'Tao Feeq', email: 'feeq@mail.com' },
  ];
  const userInfo = list?.find(({ name }) => name === nameS);
  if (!userInfo) return { message: 'User not found' };
  return userInfo;
});

describe('createTool', () => {
  const testTool = createTool({
    id: 'Test tool',
    description: 'This is a test tool that returns the name and email',
    inputSchema: z.object({
      name: z.string(),
    }),
    execute: ({ context }) => {
      return mockFindUser(context.name) as Promise<Record<string, any>>;
    },
  });

  it('should call mockFindUser', async () => {
    await testTool.execute({
      context: { name: 'Dero Israel' },
    });

    expect(mockFindUser).toHaveBeenCalledTimes(1);
    expect(mockFindUser).toHaveBeenCalledWith('Dero Israel');
  });

  it("should return an object containing 'Dero Israel' as name and 'dero@mail.com' as email", async () => {
    const user = await testTool.execute({
      context: { name: 'Dero Israel' },
    });

    expect(user).toStrictEqual({ name: 'Dero Israel', email: 'dero@mail.com' });
  });

  it("should return an object containing 'User not found' message", async () => {
    const user = await testTool.execute({
      context: { name: 'Taofeeq Oluderu' },
    });
    expect(user).toStrictEqual({ message: 'User not found' });
  });

  it('should support schema validation for tool inputs', async () => {
    const userSchema = z.object({
      name: z.string(),
      age: z.number().min(18),
      email: z.string().email(),
    });
    
    const mockExecute = vi.fn().mockImplementation(({ context }) => {
      const result = userSchema.safeParse(context);
      
      if (!result.success) {
        return Promise.resolve({
          valid: false,
          errors: result.error.format(),
        });
      }
      
      return Promise.resolve({
        valid: true,
        data: result.data,
      });
    });

    const validationTool = createTool({
      id: 'Validation tool',
      description: 'This tool validates input using schema',
      inputSchema: userSchema,
      execute: mockExecute,
    });

    // Test with valid input
    const validResult = await validationTool.execute({
      context: { name: 'John Doe', age: 25, email: 'john.doe@example.com' },
    });
    
    expect(validResult).toHaveProperty('valid', true);
    expect(validResult).toHaveProperty('data');
    expect(validResult.data).toStrictEqual({ 
      name: 'John Doe', 
      age: 25, 
      email: 'john.doe@example.com' 
    });
    
    // Test with invalid input
    const invalidResult = await validationTool.execute({
      context: { name: 'John Doe', age: 15, email: 'invalid-email' },
    });
    
    expect(invalidResult).toHaveProperty('valid', false);
    expect(invalidResult).toHaveProperty('errors');
    expect(invalidResult.errors).toHaveProperty('age');
    expect(invalidResult.errors).toHaveProperty('email');
  });
});
