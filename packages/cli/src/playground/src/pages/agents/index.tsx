import { useNavigate } from 'react-router';

import { Agent } from '@/components/ui/app-sidebar';
import { Header } from '@/components/ui/header';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

import { useAgents } from '@/hooks/use-agents';

function Agents() {
  const { agents, isLoading } = useAgents();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col relative overflow-hidden">
      <Header title="Agents" />
      <section className="flex-1 relative overflow-hidden">
        <ScrollArea className="h-full">
          <section className="">
            {isLoading ? (
              <div className="border-b-gray-6 flex flex-col gap-2 px-2 pt-2 pb-2 border-b-[0.1px] text-[0.8125rem]">
                <div>
                  <Skeleton className="h-8 w-full" />
                </div>
                <div>
                  <Skeleton className="h-8 w-full" />
                </div>
                <div>
                  <Skeleton className="h-8 w-full" />
                </div>
              </div>
            ) : (
              Object.entries(agents).map(([key, agent]) => (
                <button
                  onClick={() => {
                    navigate(`/agents/${key}/chat`);
                  }}
                  key={key}
                  className=" divide-y-[0.5px] border-b-[0.5px] w-full px-3 py-3 flex items-center justify-between text-[0.8125rem]"
                >
                  <div className="flex items-center gap-2">
                    <Agent />
                    <div className="font-medium text-mastra-el-5">{agent.name}</div>
                  </div>
                  <div className="text-mastra-el-5 text-sm">{agent.provider?.toUpperCase()}</div>
                </button>
              ))
            )}
          </section>
        </ScrollArea>
      </section>
    </div>
  );
}

export default Agents;
