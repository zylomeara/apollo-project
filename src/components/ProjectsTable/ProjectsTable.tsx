import React, { useCallback, useMemo, useRef, useState } from "react";
import { withApolloClient } from "../../hoc/withApolloClient";
import {
  _SortCriterionSpecification,
  _SortOrder,
  GetProjectsQuery,
  useDeleteProjectMutation,
  useGetProjectsQuery
} from "../../__generate/graphql-frontend";
import { Table, Space, Row, Col, Button, Input, InputRef } from "antd";
import { NetworkStatus } from "@apollo/client/core/networkStatus";
import { useSwitcher } from "../../utils/hooks";
import { EditProjectModal } from "../EditProjectModal/EditProjectModal";
import {
  ColumnType,
  FilterConfirmProps,
  FilterValue,
  SorterResult,
  TablePaginationConfig
} from "antd/lib/table/interface";
import { ProjectTasksDrawer } from "../ProjectTasksDrawer/ProjectTasksDrawer";
import { SearchOutlined } from "@ant-design/icons";
import Highlighter from "react-highlight-words";

export type QueryProject = GetProjectsQuery['searchProject']['elems'][number];

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_CURRENT_PAGE = 1;

const ProjectsTable = () => {
  const [currentPage, setCurrentPage] = useState(DEFAULT_CURRENT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sortListWithOrder, setSortListWithOrder] = useState<_SortCriterionSpecification[]>([]);
  const searchInputRef = useRef<InputRef | null>(null);

  const [isOpenProjectModal, openProjectModal, closeProjectModal] = useSwitcher();
  const [selectedProject, setSelectedProject] = useState<QueryProject | null>(null);
  const [projectForShowTasks, setProjectForShowTasks] = useState<QueryProject | null>(null);

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

  const { data, loading, error, refetch, networkStatus } = useGetProjectsQuery({
    fetchPolicy: 'no-cache',
    notifyOnNetworkStatusChange: true,
    variables: {
      ...!!sortListWithOrder.length && { sort: sortListWithOrder },
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
      ...!!conditionForAPI && {
        cond: conditionForAPI,
      }
    }
  });
  const refetching = networkStatus === NetworkStatus.refetch;

  const [deleteProjectMutation, { loading: isDeletingProject }] = useDeleteProjectMutation();

  const handleChangeTable = useCallback((
    pagination: TablePaginationConfig,
    filters: Record<string, FilterValue | null>,
    sorter: SorterResult<QueryProject> | SorterResult<QueryProject>[],
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

  if (error) return <div>Ошибка: {error.message}</div>;

  const handleSearch = (text: string, confirm: (param?: FilterConfirmProps) => void, dataIndex: string) => {
    confirm();
    setSearchTextRecord(r => ({...r, [dataIndex]: text}));
  };


  const getColumnSearchProps = (dataIndex: string, fieldName = dataIndex): ColumnType<QueryProject> => ({
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
      ) : (
        text
      );
    },
  });

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: '20%',
      ...getColumnSearchProps('$id', 'ID'),
    },
    {
      title: 'Имя',
      dataIndex: 'name',
      sorter: true,
      width: '60%',
      ...getColumnSearchProps('name', 'Имя'),
    },
    {
      title: 'Действия',
      key: 'action',
      render: (_text: any, record: QueryProject) => (
        <Space size="middle">
          <a onClick={() => setProjectForShowTasks(record)}>
            Задачи
          </a>
          <a onClick={() => {
            setSelectedProject(record);
            openProjectModal();
          }}>
            Редактировать
          </a>
          <a onClick={async () => {
            try {
              await deleteProjectMutation({
                variables: {
                  id: record.id,
                },
              })
            } finally {
              refetch();
            }
          }}>
            Удалить
          </a>
        </Space>
      ),
    },
  ];
  const totalCount = data?.searchProject.count || 0;

  return (
    <Space direction="vertical" style={{ padding: 10, height: '100%', width: '100%' }}>
      <Row>
        <Col span={2}>
          <h3>Проекты</h3>
        </Col>
        <Col offset={17} span={5}>
          <Space direction="horizontal">
            <Button onClick={() => refetch()}>
              Обновить
            </Button>
            <Button onClick={openProjectModal}>
              Добавить
            </Button>
          </Space>
        </Col>
      </Row>
      <Table
        columns={columns}
        dataSource={data?.searchProject.elems || []}
        rowKey={record => record.id}
        loading={refetching || isDeletingProject || loading}
        onChange={handleChangeTable}
        pagination={{
          total: totalCount,
          pageSize,
          current: currentPage,
          pageSizeOptions: [10, 30, 60],
          showTotal: (total: number) => `Всего: ${total}`,
          showSizeChanger: true,
        }}
      />
      <EditProjectModal
        projectForEdit={selectedProject}
        visible={isOpenProjectModal}
        onCancel={() => {
          closeProjectModal();
          setSelectedProject(null);
        }}
        onOk={() => {
          refetch()
          closeProjectModal();
          setSelectedProject(null);
        }}
      />
      <ProjectTasksDrawer
        selectedProject={projectForShowTasks}
        onClose={() => setProjectForShowTasks(null)}
      />
    </Space>
  )
}

export default withApolloClient(ProjectsTable);
