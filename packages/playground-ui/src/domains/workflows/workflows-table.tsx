'use client';

import { AutomationIcon } from '@/components/icons/automation-icon';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';

export const WorkflowsTable = <T,>({
  title,
  workflowsList,
  columns,
  isLoading,
}: {
  title?: React.ReactNode;
  workflowsList: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
}) => {
  return (
    <DataTable
      title={title}
      withoutBorder
      withoutRadius
      isLoading={isLoading}
      icon={<AutomationIcon className="h-4 w-4" />}
      columns={columns}
      data={workflowsList}
      className="border-t-0' border-[0.5px] border-x-0"
    />
  );
};
