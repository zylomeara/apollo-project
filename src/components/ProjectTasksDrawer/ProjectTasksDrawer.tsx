import { Button, Col, Drawer, Space, Table, Row, Input, InputRef } from "antd";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QueryProject } from "../ProjectsTable/ProjectsTable";
import {
  _SortCriterionSpecification, _SortOrder,
  GetTasksQuery,
  useDeleteTaskMutation,
  useGetTasksLazyQuery
} from "../../__generate/graphql-frontend";
import { NetworkStatus } from "@apollo/client/core/networkStatus";
import { useSwitcher } from "../../utils/hooks";
import { EditTaskModal } from "../EditTaskModal/EditTaskModal";
import {
  ColumnType,
  FilterConfirmProps,
  FilterValue,
  SorterResult,
  TablePaginationConfig
} from "antd/lib/table/interface";
import { SearchOutlined } from "@ant-design/icons";
import Highlighter from "react-highlight-words";

interface IProps {
  selectedProject: QueryProject | null;
  onClose(): void;
}

export type QueryTask = GetTasksQuery['searchTask']['elems'][number];

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_CURRENT_PAGE = 1;

export const ProjectTasksDrawer = ({ selectedProject, onClose }: IProps) => {
  const [currentPage, setCurrentPage] = useState(DEFAULT_CURRENT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sortListWithOrder, setSortListWithOrder] = useState<_SortCriterionSpecification[]>([]);
  const [getTasksLazyQuery, { data, loading, error, networkStatus, refetch }] = useGetTasksLazyQuery({
    notifyOnNetworkStatusChange: true,
    fetchPolicy: 'no-cache',
  });
  const [deleteTaskMutation, { loading: isDeletingTask }] = useDeleteTaskMutation();
  const refetching = networkStatus === NetworkStatus.refetch;
  const searchInputRef = useRef<InputRef | null>(null);
  const [searchTextRecord, setSearchTextRecord] = useState<Partial<Record<string, string>>>({});
  const conditionForAPI = useMemo(() =>
      Object.entries(searchTextRecord)
        .reduce((acc, [field, val]) => {
            const cond = `it.${field}.$lower $like '%${val}%'`;

            return !acc.length
              ? cond
              : `${acc} && ${cond}`;
          }
          , ''),
    [searchTextRecord],
  );

  const handleSearch = (text: string, confirm: (param?: FilterConfirmProps) => void, dataIndex: string) => {
    confirm();
    setSearchTextRecord(r => ({...r, [dataIndex]: text}));
  };

  const getColumnSearchProps = (dataIndex: string, fieldName = dataIndex): ColumnType<QueryTask> => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters = () => {} }) => {
      const [inputValue, setInputValue] = [
        selectedKeys[0] ? String(selectedKeys[0]) : '',
        (value: string) => setSelectedKeys(!!value ? [value] : []),
      ];

      return (
        <div style={{ padding: 8 }}>
          <Input
            ref={node => {
              searchInputRef.current = node;
            }}
            placeholder={`Поиск ${fieldName}`}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onPressEnter={() => handleSearch(inputValue, confirm, dataIndex)}
            style={{ marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => handleSearch(inputValue, confirm, dataIndex)}
              icon={<SearchOutlined/>}
              size="small"
              style={{ width: 90 }}
            >
              Поиск
            </Button>
            <Button
              onClick={() => {
                clearFilters();
                setSearchTextRecord(({[dataIndex]: __, ...r}) => r);
                setInputValue('');
                confirm();
              }}
              size="small"
              style={{ width: 90 }}
            >
              Сброс
            </Button>
          </Space>
        </div>
      );
    },
    filterIcon: filtered => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
    onFilterDropdownVisibleChange: visible => {
      if (visible) {
        setTimeout(() => searchInputRef.current?.select(), 100);
      }
    },
    render: text => {
      const [field, searchTextVal] = Object.entries(searchTextRecord)
        .find(([field, _val]) => dataIndex === field)
        || [null, null];

      return !!field && !!searchTextVal ? (
        <Highlighter
          highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
          searchWords={[searchTextVal]}
          autoEscape
          textToHighlight={text ? text.toString() : ''}
        />
      ) : text;
    },
  });


  const columns = [
    {
      title: 'Название задачи',
      dataIndex: 'title',
      sorter: true,
      width: '20%',
      ...getColumnSearchProps('title', 'Название задачи'),
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      sorter: true,
      ...getColumnSearchProps('description', 'Описание'),
    },
    {
      title: 'Действия',
      key: 'action',
      width: '20%',
      render: (_text: any, record: QueryTask) => (
        <Space size="middle">
          <a onClick={() => {
            openTaskModal();
            setSelectedTask(record);
          }}>
            Редактировать
          </a>
          <a onClick={async () => {
            try {
              await deleteTaskMutation({
                variables: {
                  id: record.id,
                }
              })
            } finally {
              refetch()
            }
          }}>
            Удалить
          </a>
        </Space>
      ),
    }
  ];
  const [isOpenTaskModal, openTaskModal, closeTaskModal] = useSwitcher();
  const [selectedTask, setSelectedTask] = useState<QueryTask | null>(null);

  const handleChangeTable = useCallback((
    pagination: TablePaginationConfig,
    filters: Record<string, FilterValue | null>,
    sorter: SorterResult<QueryTask> | SorterResult<QueryTask>[],
  ) => {
    setCurrentPage(pagination.current || DEFAULT_CURRENT_PAGE);
    setPageSize(pagination.pageSize || DEFAULT_PAGE_SIZE);

    const sorters = Array.isArray(sorter) ? sorter : [sorter];
    setSortListWithOrder(sorters
      .filter(item => !!item.field && !!item.order)
      .map(item => ({
        crit: `it.${item.field}`,
        order: item.order === 'ascend' ? _SortOrder.Asc : _SortOrder.Desc,
        nullsLast: true,
      })))
  }, []);


  useEffect(() => {
    if (selectedProject) {
      getTasksLazyQuery({
        variables: {
          cond: `it.project.$id == '${selectedProject.id}'${conditionForAPI && ` && ${conditionForAPI}`}`,
          ...!!sortListWithOrder.length && { sort: sortListWithOrder },
          limit: pageSize,
          offset: (currentPage - 1) * pageSize,
        }
      })
    } else {
      setCurrentPage(DEFAULT_CURRENT_PAGE);
      setPageSize(DEFAULT_PAGE_SIZE);
    }
  }, [selectedProject, sortListWithOrder, pageSize, currentPage]);

  if (error) return <div>Ошибка: {error.message}</div>;

  const totalCount = data?.searchTask.count || 0;

  return (
    <Drawer
      title={`Задачи проекта ${selectedProject?.name}`}
      placement="right"
      visible={!!selectedProject}
      width="80%"
      onClose={onClose}
    >
      <Space direction="vertical" style={{ height: '100%', width: '100%' }}>
        <Row>
          <Col span={4}>
            <h4>Таблица задач</h4>
          </Col>
          <Col offset={14} span={6}>
            <Space direction="horizontal">
              <Button onClick={() => refetch()}>
                Обновить
              </Button>
              <Button onClick={openTaskModal}>
                Добавить
              </Button>
            </Space>
          </Col>
        </Row>
        <Table
          columns={columns}
          dataSource={data?.searchTask.elems || []}
          rowKey={record => record.id}
          loading={loading || isDeletingTask || refetching}
          pagination={{
            total: totalCount,
            pageSize,
            current: currentPage,
            pageSizeOptions: [10, 30, 60],
            showTotal: (total: number) => `Всего: ${total}`,
            showSizeChanger: true,
          }}
          onChange={handleChangeTable}
        />
        {!!selectedProject && (
          <EditTaskModal
            selectedTask={selectedTask}
            selectedProject={selectedProject}
            visible={isOpenTaskModal}
            onCancel={() => {
              closeTaskModal();
              setSelectedTask(null);
            }}
            onOk={() => {
              refetch();
              closeTaskModal();
              setSelectedTask(null);
            }}
          />
        )}
      </Space>
    </Drawer>
  );
}
