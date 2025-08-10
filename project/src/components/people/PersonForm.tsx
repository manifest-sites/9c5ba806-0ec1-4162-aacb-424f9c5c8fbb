import { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Form, 
  Input, 
  Select, 
  Button, 
  Card, 
  Row, 
  Col, 
  Typography, 
  Space,
  Checkbox,
  DatePicker,
  InputNumber,
  message,
  Spin,
  Alert,
  Tag
} from 'antd';
import { 
  SaveOutlined, 
  ArrowLeftOutlined,
  PlusOutlined,
  CloseOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { AppContext } from '../../App';
import { Person } from '../../entities/Person';
import { ProfileFieldDef } from '../../entities/ProfileFieldDef';
import { Tag as TagEntity } from '../../entities/Tag';
import { Household } from '../../entities/Household';
import type { Person as PersonType, ProfileFieldDef as ProfileFieldDefType, Tag as TagType, Household as HouseholdType, ApiResponse } from '../../types';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export default function PersonForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { organizationId, userRole } = useContext(AppContext);
  const [form] = Form.useForm();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [person, setPerson] = useState<PersonType>();
  const [profileFields, setProfileFields] = useState<ProfileFieldDefType[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [households, setHouseholds] = useState<HouseholdType[]>([]);
  const [error, setError] = useState<string>();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const isEdit = Boolean(id);
  const isReadOnly = userRole === 'viewer';

  useEffect(() => {
    loadData();
  }, [id, organizationId]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(undefined);

      const [fieldsRes, tagsRes, householdsRes] = await Promise.all([
        ProfileFieldDef.list(),
        TagEntity.list(),
        Household.list()
      ]);

      if (!fieldsRes.success) throw new Error(fieldsRes.message);
      if (!tagsRes.success) throw new Error(tagsRes.message);
      if (!householdsRes.success) throw new Error(householdsRes.message);

      const visibleFields = fieldsRes.data.filter((f: ProfileFieldDefType) => 
        !f.archived && (f.visibility === 'public' || userRole !== 'viewer')
      );

      setProfileFields(visibleFields);
      setTags(tagsRes.data);
      setHouseholds(householdsRes.data);

      if (isEdit && id) {
        const personRes: ApiResponse<PersonType> = await Person.get(id);
        if (!personRes.success) throw new Error(personRes.message);
        
        const personData = personRes.data;
        setPerson(personData);

        form.setFieldsValue({
          firstName: personData.firstName,
          lastName: personData.lastName,
          preferredName: personData.preferredName,
          email: personData.email,
          phone: personData.phone,
          status: personData.status,
          tagIds: personData.tagIds,
          householdId: personData.householdId,
          ...Object.fromEntries(
            visibleFields.map(field => [
              field.key, 
              personData.fields?.[field.key]
            ])
          )
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      setSaving(true);

      const dynamicFields = Object.fromEntries(
        profileFields.map(field => [field.key, values[field.key]])
      );

      const personData: Partial<PersonType> = {
        organizationId,
        firstName: values.firstName,
        lastName: values.lastName,
        preferredName: values.preferredName,
        email: values.email,
        phone: values.phone,
        status: values.status,
        tagIds: values.tagIds || [],
        householdId: values.householdId,
        fields: dynamicFields
      };

      let response: ApiResponse<PersonType>;
      if (isEdit && id) {
        response = await Person.update(id, personData);
      } else {
        response = await Person.create(personData);
      }

      if (!response.success) {
        throw new Error(response.message);
      }

      message.success(`Person ${isEdit ? 'updated' : 'created'} successfully`);
      setHasUnsavedChanges(false);
      navigate(`/people/${response.data._id}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to save person');
    } finally {
      setSaving(false);
    }
  };

  const createTag = async (tagName: string) => {
    try {
      const response: ApiResponse<TagType> = await TagEntity.create({
        organizationId,
        name: tagName
      });

      if (!response.success) throw new Error(response.message);

      const newTag = response.data;
      setTags(prev => [...prev, newTag]);
      
      const currentTags = form.getFieldValue('tagIds') || [];
      form.setFieldValue('tagIds', [...currentTags, newTag._id]);
      
      message.success(`Tag "${tagName}" created`);
      return newTag._id;
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to create tag');
      return null;
    }
  };

  const renderDynamicField = (field: ProfileFieldDefType) => {
    const commonProps = {
      key: field.key,
      required: field.required,
      disabled: isReadOnly
    };

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
        return (
          <Form.Item
            name={field.key}
            label={field.label}
            rules={[
              { required: field.required, message: `${field.label} is required` },
              field.type === 'email' && { type: 'email', message: 'Invalid email format' }
            ]}
            {...commonProps}
          >
            <Input />
          </Form.Item>
        );

      case 'textarea':
        return (
          <Form.Item
            name={field.key}
            label={field.label}
            rules={[{ required: field.required, message: `${field.label} is required` }]}
            {...commonProps}
          >
            <TextArea rows={3} />
          </Form.Item>
        );

      case 'number':
        return (
          <Form.Item
            name={field.key}
            label={field.label}
            rules={[{ required: field.required, message: `${field.label} is required` }]}
            {...commonProps}
          >
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
        );

      case 'date':
        return (
          <Form.Item
            name={field.key}
            label={field.label}
            rules={[{ required: field.required, message: `${field.label} is required` }]}
            {...commonProps}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        );

      case 'checkbox':
        return (
          <Form.Item
            name={field.key}
            valuePropName="checked"
            {...commonProps}
          >
            <Checkbox>{field.label}</Checkbox>
          </Form.Item>
        );

      case 'select':
        return (
          <Form.Item
            name={field.key}
            label={field.label}
            rules={[{ required: field.required, message: `${field.label} is required` }]}
            {...commonProps}
          >
            <Select allowClear>
              {field.options?.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        );

      case 'multiselect':
        return (
          <Form.Item
            name={field.key}
            label={field.label}
            rules={[{ required: field.required, message: `${field.label} is required` }]}
            {...commonProps}
          >
            <Select mode="multiple" allowClear>
              {field.options?.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        );

      default:
        return null;
    }
  };

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
        message="Error loading form" 
        description={error}
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
            onClick={() => navigate(isEdit ? `/people/${id}` : '/people/list')}
          >
            Back
          </Button>
          <Title level={2} className="!mb-0">
            {isEdit ? 'Edit Person' : 'Add Person'}
          </Title>
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        onValuesChange={() => setHasUnsavedChanges(true)}
        disabled={isReadOnly}
      >
        <Row gutter={24}>
          <Col span={24}>
            <Card title="Basic Information">
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item
                    name="firstName"
                    label="First Name"
                    rules={[{ required: true, message: 'First name is required' }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    name="lastName"
                    label="Last Name"
                    rules={[{ required: true, message: 'Last name is required' }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="preferredName" label="Preferred Name">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item 
                    name="email" 
                    label="Email"
                    rules={[{ type: 'email', message: 'Invalid email format' }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="phone" label="Phone">
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    name="status"
                    label="Status"
                    rules={[{ required: true, message: 'Status is required' }]}
                  >
                    <Select>
                      <Option value="active">Active</Option>
                      <Option value="inactive">Inactive</Option>
                      <Option value="visitor">Visitor</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item name="tagIds" label="Tags">
                    <Select
                      mode="multiple"
                      allowClear
                      placeholder="Select tags"
                      onSearch={async (value) => {
                        if (value && !tags.find(t => t.name.toLowerCase() === value.toLowerCase())) {
                          // Show option to create tag
                        }
                      }}
                      dropdownRender={menu => (
                        <div>
                          {menu}
                          <div className="p-2 border-t">
                            <Button
                              type="text"
                              icon={<PlusOutlined />}
                              size="small"
                              onClick={() => {
                                const tagName = prompt('Enter new tag name:');
                                if (tagName) createTag(tagName);
                              }}
                            >
                              Create new tag
                            </Button>
                          </div>
                        </div>
                      )}
                    >
                      {tags.map(tag => (
                        <Option key={tag._id} value={tag._id}>
                          <Tag color={tag.color || 'default'}>{tag.name}</Tag>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="householdId" label="Household">
                    <Select allowClear placeholder="Select household">
                      {households.map(household => (
                        <Option key={household._id} value={household._id}>
                          {household.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          {profileFields.length > 0 && (
            <Col span={24}>
              <Card title="Additional Information">
                <Row gutter={16}>
                  {profileFields.map(field => (
                    <Col 
                      key={field.key} 
                      xs={24} 
                      md={field.type === 'textarea' ? 24 : 12}
                    >
                      {renderDynamicField(field)}
                    </Col>
                  ))}
                </Row>
              </Card>
            </Col>
          )}
        </Row>

        {!isReadOnly && (
          <div className="flex justify-end space-x-4 pt-4">
            <Button onClick={() => navigate(isEdit ? `/people/${id}` : '/people/list')}>
              Cancel
            </Button>
            <Button 
              type="primary" 
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={saving}
            >
              {isEdit ? 'Update' : 'Create'} Person
            </Button>
          </div>
        )}
      </Form>
    </div>
  );
}