// import { Thread } from '@assistant-ui/react';
// TODO: Move to primitive so we can style it
import { Thread } from '@/components/assistant-ui/thread';

import { MastraRuntimeProvider } from '@/services/mastra-runtime-provider';

export const AgentChat = ({ agentId }: { agentId: string }) => {
  return (
    <MastraRuntimeProvider agentId={agentId}>
      <Thread />
    </MastraRuntimeProvider>
  );
};
