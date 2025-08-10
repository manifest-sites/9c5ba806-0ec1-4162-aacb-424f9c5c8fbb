import { useContext, useEffect, useState } from 'react';
import { 
  Card, 
  Typography, 
  Button, 
  Space, 
  Table, 
  Tag,
  Modal,
  Form,
  Input,
  ColorPicker,
  message,
  Spin,
  Alert,
  Dropdown
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  EyeOutlined,
  MoreOutlined
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { AppContext } from '../App';
import { Tag as TagEntity } from '../entities/Tag';
import { Person } from '../entities/Person';
import type { Tag as TagType, Person as PersonType, ApiResponse } from '../types';

const { Title } = Typography;

interface TagWithUsage extends TagType {
  usageCount: number;
}

export default function Tags() {
  const navigate = useNavigate();
  const { organizationId, userRole } = useContext(AppContext);
  
  const [loading, setLoading] = useState(true);
  const [tags, setTags] = useState<TagWithUsage[]>([]);
  const [people, setPeople] = useState<PersonType[]>([]);
  const [error, setError] = useState<string>();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTag, setEditingTag] = useState<TagType>();
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

      const [tagsRes, peopleRes] = await Promise.all([
        TagEntity.list(),
        Person.list()
      ]);

      if (!tagsRes.success) throw new Error(tagsRes.message);
      if (!peopleRes.success) throw new Error(peopleRes.message);

      const tagsWithUsage = tagsRes.data.map((tag: TagType) => ({
        ...tag,
        usageCount: peopleRes.data.filter((person: PersonType) => 
          person.tagIds.includes(tag._id)
        ).length
      }));

      setTags(tagsWithUsage);
      setPeople(peopleRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEdit = async (values: { name: string; color?: string }) => {
    try {
      setSaving(true);

      let response: ApiResponse<TagType>;
      if (editingTag) {
        response = await TagEntity.update(editingTag._id, {
          ...values,
          organizationId,
          color: values.color || null
        });
      } else {
        response = await TagEntity.create({
          ...values,
          organizationId,
          color: values.color || null
        });
      }

      if (!response.success) throw new Error(response.message);

      message.success(`Tag ${editingTag ? 'updated' : 'created'} successfully`);
      setModalVisible(false);
      setEditingTag(undefined);
      form.resetFields();
      await loadData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to save tag');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tag: TagWithUsage) => {
    if (tag.usageCount > 0) {
      Modal.confirm({
        title: 'Tag in Use',
        content: `This tag is used by ${tag.usageCount} people. Are you sure you want to delete it? This will remove the tag from all people.`,
        okText: 'Delete',
        okType: 'danger',
        onOk: async () => {
          await deleteTag(tag);
        }
      });
    } else {
      Modal.confirm({
        title: 'Delete Tag',
        content: `Are you sure you want to delete "${tag.name}"?`,
        okText: 'Delete',
        okType: 'danger',
        onOk: async () => {
          await deleteTag(tag);
        }
      });
    }
  };

  const deleteTag = async (tag: TagType) => {
    try {
      // Remove tag from all people who have it
      const peopleWithTag = people.filter(person => person.tagIds.includes(tag._id));
      for (const person of peopleWithTag) {
        const updatedTagIds = person.tagIds.filter(tagId => tagId !== tag._id);
        await Person.update(person._id, { tagIds: updatedTagIds });
      }

      // Delete the tag
      await TagEntity.update(tag._id, { archived: true });
      
      message.success('Tag deleted successfully');
      await loadData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to delete tag');
    }
  };

  const openModal = (tag?: TagType) => {
    setEditingTag(tag);
    if (tag) {
      form.setFieldsValue({ 
        name: tag.name,
        color: tag.color 
      });
    } else {
      form.resetFields();
    }
    setModalVisible(true);
  };

  const handleViewPeople = (tag: TagType) => {
    navigate(`/people/list?tags=${tag._id}`);
  };

  const columns: ColumnsType<TagWithUsage> = [
    {
      title: 'Tag',
      key: 'tag',
      render: (_, record) => (
        <Tag color={record.color || 'default'} className="text-sm">
          {record.name}
        </Tag>
      ),
    },
    {
      title: 'Usage Count',
      dataIndex: 'usageCount',
      key: 'usageCount',
      render: (count: number) => (
        <span className="font-medium">{count}</span>
      ),
      sorter: (a, b) => a.usageCount - b.usageCount,
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
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
                label: 'View People',
                onClick: () => handleViewPeople(record)
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
        message="Error loading tags" 
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
        <Title level={2}>Tags</Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => openModal()}
          disabled={isReadOnly}
        >
          Create Tag
        </Button>
      </div>

      <Card>
        <Table<TagWithUsage>
          columns={columns}
          dataSource={tags}
          rowKey="_id"
          pagination={{
            pageSize: 50,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} tags`
          }}
        />
      </Card>

      <Modal
        title={editingTag ? 'Edit Tag' : 'Create Tag'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingTag(undefined);
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
            label="Tag Name"
            rules={[{ required: true, message: 'Please enter tag name' }]}
          >
            <Input placeholder="Enter tag name" />
          </Form.Item>
          
          <Form.Item
            name="color"
            label="Color (Optional)"
          >
            <ColorPicker 
              showText 
              format="hex"
              presets={[
                {
                  label: 'Recommended',
                  colors: [
                    '#f50',
                    '#2db7f5',
                    '#87d068',
                    '#108ee9',
                    '#f56a00',
                    '#eb2f96',
                    '#722ed1',
                    '#52c41a',
                    '#13c2c2',
                    '#1890ff',
                  ],
                },
              ]}
            />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button onClick={() => {
                setModalVisible(false);
                setEditingTag(undefined);
                form.resetFields();
              }}>
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={saving}
              >
                {editingTag ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}