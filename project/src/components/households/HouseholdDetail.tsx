import { useContext, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Card, 
  Typography, 
  Button, 
  Space, 
  Table, 
  Tag,
  Modal,
  Select,
  Form,
  message,
  Spin,
  Alert,
  Dropdown
} from 'antd';
import { 
  ArrowLeftOutlined, 
  EditOutlined, 
  PlusOutlined,
  DeleteOutlined,
  UserOutlined,
  MoreOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { AppContext } from '../../App';
import { Household } from '../../entities/Household';
import { HouseholdMember } from '../../entities/HouseholdMember';
import { Person } from '../../entities/Person';
import type { 
  Household as HouseholdType, 
  HouseholdMember as HouseholdMemberType, 
  Person as PersonType,
  ApiResponse 
} from '../../types';

const { Title, Text } = Typography;
const { Option } = Select;

interface HouseholdMemberWithPerson extends HouseholdMemberType {
  person: PersonType;
}

export default function HouseholdDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { organizationId, userRole } = useContext(AppContext);
  
  const [loading, setLoading] = useState(true);
  const [household, setHousehold] = useState<HouseholdType>();
  const [members, setMembers] = useState<HouseholdMemberWithPerson[]>([]);
  const [allPeople, setAllPeople] = useState<PersonType[]>([]);
  const [error, setError] = useState<string>();
  
  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [editingMember, setEditingMember] = useState<HouseholdMemberWithPerson>();
  const [memberForm] = Form.useForm();
  const [savingMember, setSavingMember] = useState(false);

  const isReadOnly = userRole === 'viewer';

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id, organizationId]);

  const loadData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(undefined);

      const [householdRes, membersRes, peopleRes] = await Promise.all([
        Household.get(id),
        HouseholdMember.list(),
        Person.list()
      ]);

      if (!householdRes.success) throw new Error(householdRes.message);
      if (!membersRes.success) throw new Error(membersRes.message);
      if (!peopleRes.success) throw new Error(peopleRes.message);

      const householdData = householdRes.data;
      const householdMembers = membersRes.data.filter(
        (member: HouseholdMemberType) => member.householdId === id
      );

      const membersWithPeople = await Promise.all(
        householdMembers.map(async (member: HouseholdMemberType) => {
          const person = peopleRes.data.find((p: PersonType) => p._id === member.personId);
          return person ? { ...member, person } : null;
        })
      );

      setHousehold(householdData);
      setMembers(membersWithPeople.filter(Boolean) as HouseholdMemberWithPerson[]);
      setAllPeople(peopleRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load household');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEditMember = async (values: { personId: string; relationship: string }) => {
    if (!id) return;
    
    try {
      setSavingMember(true);

      let response: ApiResponse<HouseholdMemberType>;
      if (editingMember) {
        response = await HouseholdMember.update(editingMember._id, {
          ...values,
          organizationId,
          householdId: id
        });
      } else {
        response = await HouseholdMember.create({
          ...values,
          organizationId,
          householdId: id
        });
      }

      if (!response.success) throw new Error(response.message);

      // Also update the person's householdId
      await Person.update(values.personId, { householdId: id });

      message.success(`Member ${editingMember ? 'updated' : 'added'} successfully`);
      setMemberModalVisible(false);
      setEditingMember(undefined);
      memberForm.resetFields();
      await loadData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to save member');
    } finally {
      setSavingMember(false);
    }
  };

  const handleRemoveMember = async (member: HouseholdMemberWithPerson) => {
    Modal.confirm({
      title: 'Remove Member',
      content: `Remove ${member.person.firstName} ${member.person.lastName} from this household?`,
      okText: 'Remove',
      okType: 'danger',
      onOk: async () => {
        try {
          // Remove household member record
          await HouseholdMember.update(member._id, { archived: true });
          
          // Clear person's householdId
          await Person.update(member.personId, { householdId: null });
          
          message.success('Member removed successfully');
          await loadData();
        } catch (err) {
          message.error(err instanceof Error ? err.message : 'Failed to remove member');
        }
      }
    });
  };

  const openMemberModal = (member?: HouseholdMemberWithPerson) => {
    setEditingMember(member);
    if (member) {
      memberForm.setFieldsValue({
        personId: member.personId,
        relationship: member.relationship
      });
    } else {
      memberForm.resetFields();
    }
    setMemberModalVisible(true);
  };

  const availablePeople = allPeople.filter(person => {
    if (editingMember) {
      return person._id === editingMember.personId || !person.householdId;
    }
    return !person.householdId;
  });

  const columns: ColumnsType<HouseholdMemberWithPerson> = [
    {
      title: 'Name',
      key: 'name',
      render: (_, record) => (
        <Link 
          to={`/people/${record.personId}`}
          className="font-medium text-blue-600 hover:text-blue-800"
        >
          {record.person.firstName} {record.person.lastName}
        </Link>
      ),
    },
    {
      title: 'Relationship',
      dataIndex: 'relationship',
      key: 'relationship',
      render: (relationship: string) => (
        <Tag color={
          relationship === 'head' ? 'blue' :
          relationship === 'spouse' ? 'green' :
          relationship === 'child' ? 'purple' :
          'default'
        }>
          {relationship.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => (
        <Tag color={
          record.person.status === 'active' ? 'green' : 
          record.person.status === 'inactive' ? 'orange' : 
          'purple'
        }>
          {record.person.status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_, record) => (
        <div className="text-sm">
          {record.person.email && (
            <div>
              <a href={`mailto:${record.person.email}`}>{record.person.email}</a>
            </div>
          )}
          {record.person.phone && (
            <div>
              <a href={`tel:${record.person.phone}`}>{record.person.phone}</a>
            </div>
          )}
        </div>
      ),
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
                icon: <UserOutlined />,
                label: 'View Profile',
                onClick: () => navigate(`/people/${record.personId}`)
              },
              {
                key: 'edit',
                icon: <EditOutlined />,
                label: 'Edit Relationship',
                disabled: isReadOnly,
                onClick: () => openMemberModal(record)
              },
              {
                key: 'remove',
                icon: <DeleteOutlined />,
                label: 'Remove from Household',
                disabled: isReadOnly,
                danger: true,
                onClick: () => handleRemoveMember(record)
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

  if (error || !household) {
    return (
      <Alert 
        message="Error loading household" 
        description={error || 'Household not found'}
        type="error" 
        showIcon 
        className="mb-6"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/households/list')}
          >
            Back to Households
          </Button>
          <Title level={2} className="!mb-0">{household.name}</Title>
        </div>
        <Space>
          {!isReadOnly && (
            <Button 
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openMemberModal()}
            >
              Add Member
            </Button>
          )}
        </Space>
      </div>

      <Card title={`Members (${members.length})`}>
        {members.length > 0 ? (
          <Table<HouseholdMemberWithPerson>
            columns={columns}
            dataSource={members}
            rowKey="_id"
            pagination={false}
          />
        ) : (
          <div className="text-center py-8">
            <Text type="secondary">No members in this household</Text>
            {!isReadOnly && (
              <div className="mt-4">
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={() => openMemberModal()}
                >
                  Add First Member
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      <Modal
        title={editingMember ? 'Edit Member' : 'Add Member'}
        open={memberModalVisible}
        onCancel={() => {
          setMemberModalVisible(false);
          setEditingMember(undefined);
          memberForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={memberForm}
          layout="vertical"
          onFinish={handleAddEditMember}
        >
          <Form.Item
            name="personId"
            label="Person"
            rules={[{ required: true, message: 'Please select a person' }]}
          >
            <Select
              placeholder="Select person"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children as string)?.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {availablePeople.map(person => (
                <Option key={person._id} value={person._id}>
                  {person.firstName} {person.lastName}
                  {person.email && ` (${person.email})`}
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="relationship"
            label="Relationship"
            rules={[{ required: true, message: 'Please select relationship' }]}
          >
            <Select placeholder="Select relationship">
              <Option value="head">Head of Household</Option>
              <Option value="spouse">Spouse</Option>
              <Option value="child">Child</Option>
              <Option value="other">Other</Option>
            </Select>
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button onClick={() => {
                setMemberModalVisible(false);
                setEditingMember(undefined);
                memberForm.resetFields();
              }}>
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={savingMember}
              >
                {editingMember ? 'Update' : 'Add'} Member
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}