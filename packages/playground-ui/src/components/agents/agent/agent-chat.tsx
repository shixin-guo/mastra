import { Thread } from '@assistant-ui/react';

import { MastraRuntimeProvider } from '@/services/mastra-runtime-provider';

export const AgentChat = ({ agentId }: { agentId: string }) => {
  return (
    <MastraRuntimeProvider agentId={agentId}>
      <Thread />
    </MastraRuntimeProvider>
  );
};
