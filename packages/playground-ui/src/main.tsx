import { StrictMode } from 'react';

import { createRoot } from 'react-dom/client';

import { AgentChat } from './components/agents/agent/agent-chat';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AgentChat agentId="catOne" agentName="catOne" />
  </StrictMode>,
);
