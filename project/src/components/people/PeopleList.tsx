import { useContext, useEffect, useState } from 'react';
import { 
  Table, 
  Input, 
  Select, 
  Button, 
  Tag, 
  Space, 
  Dropdown, 
  Checkbox, 
  Card,
  Row,
  Col,
  Typography,
  Spin,
  Alert
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  FilterOutlined, 
  EyeOutlined, 
  EditOutlined, 
  UserDeleteOutlined,
  MoreOutlined 
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import type { ColumnsType, TableProps } from 'antd/es/table';
import { AppContext } from '../../App';
import { Person } from '../../entities/Person';
import { Tag as TagEntity } from '../../entities/Tag';
import { ProfileFieldDef } from '../../entities/ProfileFieldDef';
import type { Person as PersonType, Tag as TagType, ProfileFieldDef as ProfileFieldDefType, ApiResponse } from '../../types';

const { Search } = Input;
const { Title } = Typography;
const { Option } = Select;

interface PeopleListProps {}

export default function PeopleList({}: PeopleListProps) {
  const navigate = useNavigate();
  const { organizationId, userRole } = useContext(AppContext);
  
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState<PersonType[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [profileFields, setProfileFields] = useState<ProfileFieldDefType[]>([]);
  const [error, setError] = useState<string>();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>();
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'name', 'email', 'phone', 'status', 'tags', 'household'
  ]);
  
  useEffect(() => {
    loadData();
  }, [organizationId]);

  useEffect(() => {
    const saved = localStorage.getItem(`people-visible-columns-${organizationId}`);
    if (saved) {
      setVisibleColumns(JSON.parse(saved));
    }
  }, [organizationId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(undefined);

      const [peopleRes, tagsRes, fieldsRes] = await Promise.all([
        Person.list(),
        TagEntity.list(),
        ProfileFieldDef.list()
      ]);

      if (!peopleRes.success) throw new Error(peopleRes.message);
      if (!tagsRes.success) throw new Error(tagsRes.message);
      if (!fieldsRes.success) throw new Error(fieldsRes.message);

      setPeople(peopleRes.data);
      setTags(tagsRes.data);
      setProfileFields(fieldsRes.data.filter((f: ProfileFieldDefType) => !f.archived));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleColumnVisibilityChange = (columns: string[]) => {
    setVisibleColumns(columns);
    localStorage.setItem(`people-visible-columns-${organizationId}`, JSON.stringify(columns));
  };

  const handleBulkAction = async (action: string) => {
    if (selectedRowKeys.length === 0) return;
    
    try {
      if (action === 'inactivate') {
        for (const personId of selectedRowKeys) {
          await Person.update(personId, { status: 'inactive' });
        }
      }
      setSelectedRowKeys([]);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to perform bulk action');
    }
  };

  const filteredPeople = people.filter(person => {
    const matchesSearch = !searchQuery || 
      person.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.phone?.includes(searchQuery);
    
    const matchesStatus = !statusFilter || person.status === statusFilter;
    const matchesTags = tagFilter.length === 0 || 
      tagFilter.some(tagId => person.tagIds.includes(tagId));
    
    return matchesSearch && matchesStatus && matchesTags;
  });

  const baseColumns: ColumnsType<PersonType> = [
    {
      title: 'Name',
      key: 'name',
      render: (_, record) => (
        <Link to={`/people/${record._id}`} className="font-medium text-blue-600 hover:text-blue-800">
          {record.preferredName || record.firstName} {record.lastName}
        </Link>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email: string) => email || '—',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string) => phone || '—',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={
          status === 'active' ? 'green' : 
          status === 'inactive' ? 'orange' : 
          'purple'
        }>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Tags',
      key: 'tags',
      render: (_, record) => (
        <Space>
          {record.tagIds.map(tagId => {
            const tag = tags.find(t => t._id === tagId);
            return tag ? (
              <Tag key={tagId} color={tag.color || 'default'}>
                {tag.name}
              </Tag>
            ) : null;
          })}
        </Space>
      ),
    },
    {
      title: 'Household',
      key: 'household',
      render: (_, record) => record.householdId ? (
        <Link to={`/households/${record.householdId}`}>
          View Household
        </Link>
      ) : '—',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'view',
                icon: <EyeOutlined />,
                label: 'View Profile',
                onClick: () => navigate(`/people/${record._id}`)
              },
              {
                key: 'edit',
                icon: <EditOutlined />,
                label: 'Edit',
                disabled: userRole === 'viewer',
                onClick: () => navigate(`/people/${record._id}/edit`)
              },
              {
                key: 'inactivate',
                icon: <UserDeleteOutlined />,
                label: 'Inactivate',
                disabled: userRole === 'viewer' || record.status === 'inactive',
                onClick: async () => {
                  await Person.update(record._id, { status: 'inactive' });
                  loadData();
                }
              }
            ]
          }}
        >
          <Button icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  const dynamicColumns: ColumnsType<PersonType> = profileFields.map(field => ({
    title: field.label,
    key: field.key,
    render: (_, record) => {
      const value = record.fields?.[field.key];
      if (!value) return '—';
      
      if (field.type === 'checkbox') return value ? 'Yes' : 'No';
      if (field.type === 'multiselect' && Array.isArray(value)) {
        return value.join(', ');
      }
      return String(value);
    },
  }));

  const allColumns = [...baseColumns, ...dynamicColumns];
  const columns = allColumns.filter(col => visibleColumns.includes(col.key as string));

  const rowSelection: TableProps<PersonType>['rowSelection'] = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys as string[]);
    },
  };

  const columnOptions = [
    { label: 'Name', value: 'name' },
    { label: 'Email', value: 'email' },
    { label: 'Phone', value: 'phone' },
    { label: 'Status', value: 'status' },
    { label: 'Tags', value: 'tags' },
    { label: 'Household', value: 'household' },
    ...profileFields.map(field => ({
      label: field.label,
      value: field.key
    }))
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert 
        message="Error loading people" 
        description={error}
        type="error" 
        showIcon 
        className="mb-6"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Title level={2}>People</Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => navigate('/people/new')}
          disabled={userRole === 'viewer'}
        >
          Add Person
        </Button>
      </div>

      <Card>
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} sm={12} md={8}>
            <Search
              placeholder="Search people..."
              allowClear
              enterButton={<SearchOutlined />}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Status"
              allowClear
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
            >
              <Option value="active">Active</Option>
              <Option value="inactive">Inactive</Option>
              <Option value="visitor">Visitor</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              mode="multiple"
              placeholder="Filter by tags"
              allowClear
              style={{ width: '100%' }}
              value={tagFilter}
              onChange={setTagFilter}
            >
              {tags.map(tag => (
                <Option key={tag._id} value={tag._id}>{tag.name}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              mode="multiple"
              placeholder="Visible columns"
              value={visibleColumns}
              onChange={handleColumnVisibilityChange}
              style={{ width: '100%' }}
            >
              {columnOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>

        {selectedRowKeys.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 rounded">
            <Space>
              <span>{selectedRowKeys.length} selected</span>
              <Button 
                size="small" 
                onClick={() => handleBulkAction('inactivate')}
                disabled={userRole === 'viewer'}
              >
                Mark Inactive
              </Button>
              <Button size="small" onClick={() => setSelectedRowKeys([])}>
                Clear Selection
              </Button>
            </Space>
          </div>
        )}

        <Table<PersonType>
          columns={columns}
          dataSource={filteredPeople}
          rowKey="_id"
          rowSelection={userRole !== 'viewer' ? rowSelection : undefined}
          pagination={{
            pageSize: 50,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} people`
          }}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
}