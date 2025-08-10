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
  Select,
  Switch,
  message,
  Spin,
  Alert,
  Dropdown,
  Row,
  Col,
  Divider
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  DragOutlined,
  EyeOutlined,
  MoreOutlined,
  HolderOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AppContext } from '../../App';
import { ProfileFieldDef } from '../../entities/ProfileFieldDef';
import type { ProfileFieldDef as ProfileFieldDefType, ApiResponse } from '../../types';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface FieldOption {
  value: string;
  label: string;
}

interface SortableRowProps {
  children: React.ReactNode;
  'data-row-key': string;
}

const SortableRow = ({ children, ...props }: SortableRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props['data-row-key'],
  });

  const style = {
    ...{
      transform: CSS.Transform.toString(transform),
      transition,
      ...(isDragging ? { position: 'relative', zIndex: 9999 } : {}),
    },
  };

  return (
    <tr {...props} ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </tr>
  );
};

export default function ProfileFields() {
  const { organizationId, userRole } = useContext(AppContext);
  
  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<ProfileFieldDefType[]>([]);
  const [error, setError] = useState<string>();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [editingField, setEditingField] = useState<ProfileFieldDefType>();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const isReadOnly = userRole === 'viewer' || userRole === 'member';

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadData();
  }, [organizationId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(undefined);

      const response: ApiResponse<ProfileFieldDefType[]> = await ProfileFieldDef.list();
      if (!response.success) throw new Error(response.message);

      const sortedFields = response.data
        .filter((field: ProfileFieldDefType) => !field.archived)
        .sort((a: ProfileFieldDefType, b: ProfileFieldDefType) => a.orderIndex - b.orderIndex);

      setFields(sortedFields);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile fields');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEdit = async (values: any) => {
    try {
      setSaving(true);

      const fieldData: Partial<ProfileFieldDefType> = {
        organizationId,
        key: values.key,
        label: values.label,
        type: values.type,
        options: values.options || [],
        required: values.required || false,
        visibility: values.visibility || 'public',
        archived: false,
        orderIndex: editingField ? editingField.orderIndex : fields.length
      };

      let response: ApiResponse<ProfileFieldDefType>;
      if (editingField) {
        response = await ProfileFieldDef.update(editingField._id, fieldData);
      } else {
        response = await ProfileFieldDef.create(fieldData);
      }

      if (!response.success) throw new Error(response.message);

      message.success(`Field ${editingField ? 'updated' : 'created'} successfully`);
      setModalVisible(false);
      setEditingField(undefined);
      form.resetFields();
      await loadData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to save field');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (field: ProfileFieldDefType) => {
    Modal.confirm({
      title: 'Archive Field',
      content: `Are you sure you want to archive "${field.label}"? This will hide it from forms but preserve existing data.`,
      okText: 'Archive',
      okType: 'danger',
      onOk: async () => {
        try {
          await ProfileFieldDef.update(field._id, { archived: true });
          message.success('Field archived successfully');
          await loadData();
        } catch (err) {
          message.error(err instanceof Error ? err.message : 'Failed to archive field');
        }
      }
    });
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = fields.findIndex(field => field._id === active.id);
      const newIndex = fields.findIndex(field => field._id === over.id);

      const newFields = arrayMove(fields, oldIndex, newIndex);
      setFields(newFields);

      // Update order indexes
      try {
        for (let i = 0; i < newFields.length; i++) {
          await ProfileFieldDef.update(newFields[i]._id, { orderIndex: i });
        }
        message.success('Field order updated');
      } catch (err) {
        message.error('Failed to update field order');
        await loadData(); // Reload to reset order
      }
    }
  };

  const openModal = (field?: ProfileFieldDefType) => {
    setEditingField(field);
    if (field) {
      form.setFieldsValue({
        key: field.key,
        label: field.label,
        type: field.type,
        options: field.options || [],
        required: field.required,
        visibility: field.visibility
      });
    } else {
      form.resetFields();
    }
    setModalVisible(true);
  };

  const renderFieldPreview = (field: ProfileFieldDefType) => {
    const commonProps = {
      placeholder: `Enter ${field.label.toLowerCase()}...`
    };

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
        return <Input {...commonProps} />;
      
      case 'textarea':
        return <TextArea rows={3} {...commonProps} />;
      
      case 'number':
        return <Input type="number" {...commonProps} />;
      
      case 'date':
        return <Input type="date" />;
      
      case 'checkbox':
        return <Switch /> ;
      
      case 'select':
        return (
          <Select {...commonProps}>
            {field.options?.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        );
      
      case 'multiselect':
        return (
          <Select mode="multiple" {...commonProps}>
            {field.options?.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        );
      
      default:
        return <Input {...commonProps} />;
    }
  };

  const columns: ColumnsType<ProfileFieldDefType> = [
    {
      title: 'Drag',
      key: 'drag',
      width: 50,
      render: () => <HolderOutlined style={{ cursor: 'grab', color: '#999' }} />,
    },
    {
      title: 'Field',
      key: 'field',
      render: (_, record) => (
        <div>
          <Text strong>{record.label}</Text>
          <br />
          <Text type="secondary" className="text-xs">Key: {record.key}</Text>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color="blue">{type.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Required',
      dataIndex: 'required',
      key: 'required',
      render: (required: boolean) => (
        <Tag color={required ? 'red' : 'default'}>
          {required ? 'Required' : 'Optional'}
        </Tag>
      ),
    },
    {
      title: 'Visibility',
      dataIndex: 'visibility',
      key: 'visibility',
      render: (visibility: string) => (
        <Tag color={visibility === 'staff_only' ? 'orange' : 'green'}>
          {visibility === 'staff_only' ? 'Staff Only' : 'Public'}
        </Tag>
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
                key: 'edit',
                icon: <EditOutlined />,
                label: 'Edit',
                disabled: isReadOnly,
                onClick: () => openModal(record)
              },
              {
                key: 'delete',
                icon: <DeleteOutlined />,
                label: 'Archive',
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
        message="Error loading profile fields" 
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
        <Title level={2}>Profile Fields</Title>
        <Space>
          <Button 
            icon={<EyeOutlined />}
            onClick={() => setPreviewVisible(true)}
          >
            Preview Form
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => openModal()}
            disabled={isReadOnly}
          >
            Add Field
          </Button>
        </Space>
      </div>

      <Card>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={fields.map(f => f._id)}
            strategy={verticalListSortingStrategy}
          >
            <Table<ProfileFieldDefType>
              components={{
                body: {
                  row: SortableRow,
                },
              }}
              columns={columns}
              dataSource={fields}
              rowKey="_id"
              pagination={false}
            />
          </SortableContext>
        </DndContext>
      </Card>

      <Modal
        title={editingField ? 'Edit Profile Field' : 'Create Profile Field'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingField(undefined);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateEdit}
          initialValues={{
            visibility: 'public',
            required: false
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="key"
                label="Field Key"
                rules={[
                  { required: true, message: 'Please enter field key' },
                  { pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/, message: 'Key must start with a letter and contain only letters, numbers, and underscores' }
                ]}
              >
                <Input placeholder="field_name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="label"
                label="Display Label"
                rules={[{ required: true, message: 'Please enter display label' }]}
              >
                <Input placeholder="Field Name" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="type"
            label="Field Type"
            rules={[{ required: true, message: 'Please select field type' }]}
          >
            <Select placeholder="Select field type">
              <Option value="text">Text</Option>
              <Option value="textarea">Textarea</Option>
              <Option value="number">Number</Option>
              <Option value="date">Date</Option>
              <Option value="checkbox">Checkbox</Option>
              <Option value="select">Select Dropdown</Option>
              <Option value="multiselect">Multi-Select</Option>
              <Option value="email">Email</Option>
              <Option value="phone">Phone</Option>
              <Option value="url">URL</Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => 
              prevValues.type !== currentValues.type
            }
          >
            {({ getFieldValue }) => {
              const fieldType = getFieldValue('type');
              return (fieldType === 'select' || fieldType === 'multiselect') ? (
                <Form.List name="options">
                  {(fields, { add, remove }) => (
                    <Form.Item label="Options">
                      {fields.map(({ key, name, ...restField }) => (
                        <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                          <Form.Item
                            {...restField}
                            name={[name, 'value']}
                            rules={[{ required: true, message: 'Missing value' }]}
                          >
                            <Input placeholder="Value" />
                          </Form.Item>
                          <Form.Item
                            {...restField}
                            name={[name, 'label']}
                            rules={[{ required: true, message: 'Missing label' }]}
                          >
                            <Input placeholder="Label" />
                          </Form.Item>
                          <Button onClick={() => remove(name)} danger>
                            Delete
                          </Button>
                        </Space>
                      ))}
                      <Form.Item>
                        <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                          Add Option
                        </Button>
                      </Form.Item>
                    </Form.Item>
                  )}
                </Form.List>
              ) : null;
            }}
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="required" valuePropName="checked">
                <Switch /> Required Field
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="visibility"
                label="Visibility"
              >
                <Select>
                  <Option value="public">Public (All Users)</Option>
                  <Option value="staff_only">Staff Only</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item>
            <Space>
              <Button onClick={() => {
                setModalVisible(false);
                setEditingField(undefined);
                form.resetFields();
              }}>
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={saving}
              >
                {editingField ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Person Form Preview"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width={800}
      >
        <Card title="Basic Information">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="First Name" required>
                <Input placeholder="Enter first name..." />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Last Name" required>
                <Input placeholder="Enter last name..." />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Status" required>
                <Select placeholder="Select status">
                  <Option value="active">Active</Option>
                  <Option value="inactive">Inactive</Option>
                  <Option value="visitor">Visitor</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {fields.length > 0 && (
          <Card title="Additional Information" className="mt-4">
            <Row gutter={16}>
              {fields.map(field => (
                <Col 
                  key={field._id} 
                  span={field.type === 'textarea' ? 24 : 12}
                  className="mb-4"
                >
                  <Form.Item 
                    label={field.label}
                    required={field.required}
                  >
                    {renderFieldPreview(field)}
                  </Form.Item>
                </Col>
              ))}
            </Row>
          </Card>
        )}
      </Modal>
    </div>
  );
}