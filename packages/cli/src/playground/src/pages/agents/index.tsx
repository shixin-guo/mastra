import { useNavigate } from 'react-router';
import { Header } from '@/components/ui/header';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AgentsTable } from '@mastra/playground-ui';

import { useAgents } from '@/hooks/use-agents';

function Agents() {
  const { agents, isLoading } = useAgents();
  const navigate = useNavigate();

  const agentListData = Object.entries(agents).map(([key, agent]) => ({
    id: key,
    name: agent.name,
    description: agent.instructions,
    provider: agent?.provider,
  }));

  return (
    <div className="flex flex-col relative overflow-hidden">
      <section className="flex-1 relative overflow-hidden">
        <ScrollArea className="h-full">
          <section className="">
            <AgentsTable
              isLoading={isLoading}
              title={<Header title="Agents" className="border-0" />}
              agentsList={agentListData}
              columns={[
                {
                  id: 'name',
                  header: 'Name',
                  cell: ({ row }) => (
                    <button
                      className="w-full h-full flex justify-start py-4"
                      onClick={() => {
                        navigate(`/agents/${row.original.id}/chat`);
                      }}
                    >
                      <span
                        onClick={() => {
                          navigate(`/agents/${row.original.id}/chat`);
                        }}
                        className="text-mastra-el-5 text-sm  truncate"
                      >
                        {row.original.name}
                      </span>
                    </button>
                  ),
                },

                {
                  id: 'model',
                  header: 'Model',
                  cell: ({ row }) => (
                    <button
                      className="w-full h-full flex justify-start py-4"
                      onClick={() => {
                        navigate(`/agents/${row.original.id}/chat`);
                      }}
                    >
                      <span
                        onClick={() => {
                          navigate(`/agents/${row.original.id}/chat`);
                        }}
                        className="text-mastra-el-5 text-sm"
                      >
                        {row.original.provider?.toUpperCase()}
                      </span>
                    </button>
                  ),
                },
              ]}
            />
          </section>
        </ScrollArea>
      </section>
    </div>
  );
}

export default Agents;
