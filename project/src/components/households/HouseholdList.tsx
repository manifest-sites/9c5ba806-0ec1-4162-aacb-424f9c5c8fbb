import { useContext, useEffect, useState } from 'react';
import { 
  Table, 
  Input, 
  Button, 
  Space, 
  Card,
  Typography,
  Modal,
  Form,
  message,
  Spin,
  Alert,
  Dropdown
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  EditOutlined, 
  DeleteOutlined,
  EyeOutlined,
  MoreOutlined
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { AppContext } from '../../App';
import { Household } from '../../entities/Household';
import { HouseholdMember } from '../../entities/HouseholdMember';
import { Person } from '../../entities/Person';
import type { Household as HouseholdType, HouseholdMember as HouseholdMemberType, Person as PersonType, ApiResponse } from '../../types';

const { Search } = Input;
const { Title } = Typography;

interface HouseholdWithMembers extends HouseholdType {
  memberCount: number;
}

export default function HouseholdList() {
  const navigate = useNavigate();
  const { organizationId, userRole } = useContext(AppContext);
  
  const [loading, setLoading] = useState(true);
  const [households, setHouseholds] = useState<HouseholdWithMembers[]>([]);
  const [error, setError] = useState<string>();
  const [searchQuery, setSearchQuery] = useState('');
  
  const [modalVisible, setModalVisible] = useState(false);
  const [editingHousehold, setEditingHousehold] = useState<HouseholdType>();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const isReadOnly = userRole === 'viewer';

  useEffect(() => {
    loadData();
  }, [organizationId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(undefined);

      const [householdsRes, membersRes] = await Promise.all([
        Household.list(),
        HouseholdMember.list()
      ]);

      if (!householdsRes.success) throw new Error(householdsRes.message);
      if (!membersRes.success) throw new Error(membersRes.message);

      const householdsWithMembers = householdsRes.data.map((household: HouseholdType) => ({
        ...household,
        memberCount: membersRes.data.filter((member: HouseholdMemberType) => 
          member.householdId === household._id
        ).length
      }));

      setHouseholds(householdsWithMembers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load households');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEdit = async (values: { name: string }) => {
    try {
      setSaving(true);

      let response: ApiResponse<HouseholdType>;
      if (editingHousehold) {
        response = await Household.update(editingHousehold._id, {
          ...values,
          organizationId
        });
      } else {
        response = await Household.create({
          ...values,
          organizationId
        });
      }

      if (!response.success) throw new Error(response.message);

      message.success(`Household ${editingHousehold ? 'updated' : 'created'} successfully`);
      setModalVisible(false);
      setEditingHousehold(undefined);
      form.resetFields();
      await loadData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to save household');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (household: HouseholdType) => {
    Modal.confirm({
      title: 'Delete Household',
      content: `Are you sure you want to delete "${household.name}"? This will remove all household member associations.`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          // Note: In a real app, you'd want to handle this on the backend
          // to ensure data consistency and proper cleanup
          const response = await Household.update(household._id, { archived: true });
          if (!response.success) throw new Error(response.message);
          
          message.success('Household deleted successfully');
          await loadData();
        } catch (err) {
          message.error(err instanceof Error ? err.message : 'Failed to delete household');
        }
      }
    });
  };

  const openModal = (household?: HouseholdType) => {
    setEditingHousehold(household);
    if (household) {
      form.setFieldsValue({ name: household.name });
    } else {
      form.resetFields();
    }
    setModalVisible(true);
  };

  const filteredHouseholds = households.filter(household =>
    !searchQuery || household.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns: ColumnsType<HouseholdWithMembers> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <Link to={`/households/${record._id}`} className="font-medium text-blue-600 hover:text-blue-800">
          {name}
        </Link>
      ),
    },
    {
      title: 'Members',
      dataIndex: 'memberCount',
      key: 'memberCount',
      render: (count: number) => `${count} member${count !== 1 ? 's' : ''}`,
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
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
                label: 'View Details',
                onClick: () => navigate(`/households/${record._id}`)
              },
              {
                key: 'edit',
                icon: <EditOutlined />,
                label: 'Edit',
                disabled: isReadOnly,
                onClick: () => openModal(record)
              },
              {
                key: 'delete',
                icon: <DeleteOutlined />,
                label: 'Delete',
                disabled: isReadOnly,
                danger: true,
                onClick: () => handleDelete(record)
              }
            ]
          }}
        >
          <Button icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
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
        message="Error loading households" 
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
        <Title level={2}>Households</Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => openModal()}
          disabled={isReadOnly}
        >
          Add Household
        </Button>
      </div>

      <Card>
        <div className="mb-4">
          <Search
            placeholder="Search households..."
            allowClear
            enterButton={<SearchOutlined />}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ maxWidth: 400 }}
          />
        </div>

        <Table<HouseholdWithMembers>
          columns={columns}
          dataSource={filteredHouseholds}
          rowKey="_id"
          pagination={{
            pageSize: 50,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} households`
          }}
        />
      </Card>

      <Modal
        title={editingHousehold ? 'Edit Household' : 'Create Household'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingHousehold(undefined);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateEdit}
        >
          <Form.Item
            name="name"
            label="Household Name"
            rules={[{ required: true, message: 'Please enter household name' }]}
          >
            <Input placeholder="Enter household name" />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button onClick={() => {
                setModalVisible(false);
                setEditingHousehold(undefined);
                form.resetFields();
              }}>
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={saving}
              >
                {editingHousehold ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}