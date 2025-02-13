// import { Thread } from '@assistant-ui/react';
// TODO: Move to primitive so we can style it
import { Thread } from '@/components/assistant-ui/thread';

import { MastraRuntimeProvider } from '@/services/mastra-runtime-provider';

export const AgentChat = ({ agentId, url }: { agentId: string; url: string }) => {
  return (
    <MastraRuntimeProvider agentId={agentId} url={url}>
      <Thread />
    </MastraRuntimeProvider>
  );
};
