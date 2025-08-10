import { useContext, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Card, 
  Typography, 
  Tag, 
  Button, 
  Space, 
  Descriptions, 
  Tabs, 
  List,
  Input,
  Form,
  Select,
  message,
  Spin,
  Alert,
  Divider
} from 'antd';
import { 
  EditOutlined, 
  ArrowLeftOutlined, 
  TagsOutlined,
  HomeOutlined,
  PlusOutlined,
  SendOutlined
} from '@ant-design/icons';
import { AppContext } from '../../App';
import { Person } from '../../entities/Person';
import { ProfileFieldDef } from '../../entities/ProfileFieldDef';
import { Tag as TagEntity } from '../../entities/Tag';
import { Note } from '../../entities/Note';
import { Household } from '../../entities/Household';
import { HouseholdMember } from '../../entities/HouseholdMember';
import type { 
  Person as PersonType, 
  ProfileFieldDef as ProfileFieldDefType, 
  Tag as TagType, 
  Note as NoteType,
  Household as HouseholdType,
  HouseholdMember as HouseholdMemberType,
  ApiResponse 
} from '../../types';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

export default function PersonProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { organizationId, userRole } = useContext(AppContext);
  
  const [loading, setLoading] = useState(true);
  const [person, setPerson] = useState<PersonType>();
  const [profileFields, setProfileFields] = useState<ProfileFieldDefType[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [notes, setNotes] = useState<NoteType[]>([]);
  const [household, setHousehold] = useState<HouseholdType>();
  const [householdMembers, setHouseholdMembers] = useState<(HouseholdMemberType & { person: PersonType })[]>([]);
  const [error, setError] = useState<string>();
  
  const [noteForm] = Form.useForm();
  const [savingNote, setSavingNote] = useState(false);

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

      const [personRes, fieldsRes, tagsRes, notesRes] = await Promise.all([
        Person.get(id),
        ProfileFieldDef.list(),
        TagEntity.list(),
        Note.list()
      ]);

      if (!personRes.success) throw new Error(personRes.message);
      if (!fieldsRes.success) throw new Error(fieldsRes.message);
      if (!tagsRes.success) throw new Error(tagsRes.message);
      if (!notesRes.success) throw new Error(notesRes.message);

      const personData = personRes.data;
      const visibleFields = fieldsRes.data.filter((f: ProfileFieldDefType) => 
        !f.archived && (f.visibility === 'public' || userRole !== 'viewer')
      );
      const personNotes = notesRes.data
        .filter((note: NoteType) => note.personId === id)
        .sort((a: NoteType, b: NoteType) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

      setPerson(personData);
      setProfileFields(visibleFields);
      setTags(tagsRes.data);
      setNotes(personNotes);

      if (personData.householdId) {
        const householdRes: ApiResponse<HouseholdType> = await Household.get(personData.householdId);
        if (householdRes.success) {
          setHousehold(householdRes.data);
          
          const membersRes: ApiResponse<HouseholdMemberType[]> = await HouseholdMember.list();
          if (membersRes.success) {
            const householdMemberData = membersRes.data.filter(
              (m: HouseholdMemberType) => m.householdId === personData.householdId
            );
            
            const membersWithPeople = await Promise.all(
              householdMemberData.map(async (member: HouseholdMemberType) => {
                const memberPersonRes: ApiResponse<PersonType> = await Person.get(member.personId);
                return {
                  ...member,
                  person: memberPersonRes.success ? memberPersonRes.data : null
                };
              })
            );
            
            setHouseholdMembers(membersWithPeople.filter(m => m.person));
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load person');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (values: { body: string; visibility: 'org' | 'staff_only' }) => {
    if (!id) return;
    
    try {
      setSavingNote(true);

      const response: ApiResponse<NoteType> = await Note.create({
        organizationId,
        personId: id,
        authorUserId: 'current-user-id',
        body: values.body,
        visibility: values.visibility
      });

      if (!response.success) throw new Error(response.message);

      setNotes(prev => [response.data, ...prev]);
      noteForm.resetFields();
      message.success('Note added successfully');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to add note');
    } finally {
      setSavingNote(false);
    }
  };

  const getPersonTags = () => {
    return person?.tagIds.map(tagId => tags.find(t => t._id === tagId)).filter(Boolean) || [];
  };

  const renderDynamicFieldValue = (field: ProfileFieldDefType, value: any) => {
    if (!value) return '—';

    switch (field.type) {
      case 'checkbox':
        return value ? 'Yes' : 'No';
      case 'multiselect':
        if (Array.isArray(value)) {
          return value.join(', ');
        }
        return String(value);
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'select':
        const option = field.options?.find(opt => opt.value === value);
        return option ? option.label : value;
      default:
        return String(value);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (error || !person) {
    return (
      <Alert 
        message="Error loading person" 
        description={error || 'Person not found'}
        type="error" 
        showIcon 
        className="mb-6"
      />
    );
  }

  const personTags = getPersonTags();
  const dynamicFields = profileFields.filter(field => person.fields?.[field.key] !== undefined);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/people/list')}
          >
            Back to People
          </Button>
          <div>
            <Title level={2} className="!mb-0">
              {person.preferredName || person.firstName} {person.lastName}
            </Title>
            <Tag color={
              person.status === 'active' ? 'green' : 
              person.status === 'inactive' ? 'orange' : 
              'purple'
            }>
              {person.status.toUpperCase()}
            </Tag>
          </div>
        </div>
        <Space>
          <Button 
            icon={<EditOutlined />} 
            onClick={() => navigate(`/people/${id}/edit`)}
            disabled={isReadOnly}
          >
            Edit Person
          </Button>
        </Space>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Contact Information">
            <Descriptions column={2} bordered>
              <Descriptions.Item label="First Name">{person.firstName}</Descriptions.Item>
              <Descriptions.Item label="Last Name">{person.lastName}</Descriptions.Item>
              {person.preferredName && (
                <Descriptions.Item label="Preferred Name">{person.preferredName}</Descriptions.Item>
              )}
              <Descriptions.Item label="Email">
                {person.email ? (
                  <a href={`mailto:${person.email}`}>{person.email}</a>
                ) : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                {person.phone ? (
                  <a href={`tel:${person.phone}`}>{person.phone}</a>
                ) : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={
                  person.status === 'active' ? 'green' : 
                  person.status === 'inactive' ? 'orange' : 
                  'purple'
                }>
                  {person.status.toUpperCase()}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {dynamicFields.length > 0 && (
            <Card title="Additional Information">
              <Descriptions column={2} bordered>
                {dynamicFields.map(field => (
                  <Descriptions.Item key={field.key} label={field.label}>
                    {renderDynamicFieldValue(field, person.fields?.[field.key])}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </Card>
          )}

          <Card title="Notes">
            <Tabs defaultActiveKey="list">
              <TabPane tab="All Notes" key="list">
                {notes.length > 0 ? (
                  <List
                    itemLayout="vertical"
                    dataSource={notes}
                    renderItem={note => (
                      <List.Item key={note._id}>
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <Text strong>User #{note.authorUserId.slice(-8)}</Text>
                            <div className="flex items-center space-x-2">
                              <Text type="secondary" className="text-xs">
                                {new Date(note.createdAt).toLocaleDateString()} {new Date(note.createdAt).toLocaleTimeString()}
                              </Text>
                              {note.visibility === 'staff_only' && (
                                <Tag size="small" color="orange">Staff Only</Tag>
                              )}
                            </div>
                          </div>
                          <Text>{note.body}</Text>
                        </div>
                      </List.Item>
                    )}
                  />
                ) : (
                  <Text type="secondary">No notes yet</Text>
                )}
              </TabPane>
              
              {!isReadOnly && (
                <TabPane tab="Add Note" key="add">
                  <Form
                    form={noteForm}
                    layout="vertical"
                    onFinish={handleAddNote}
                  >
                    <Form.Item
                      name="body"
                      label="Note"
                      rules={[{ required: true, message: 'Please enter a note' }]}
                    >
                      <TextArea rows={4} placeholder="Add a note..." />
                    </Form.Item>
                    <Form.Item
                      name="visibility"
                      label="Visibility"
                      initialValue="org"
                    >
                      <Select>
                        <Select.Option value="org">Organization</Select.Option>
                        <Select.Option value="staff_only">Staff Only</Select.Option>
                      </Select>
                    </Form.Item>
                    <Form.Item>
                      <Button 
                        type="primary" 
                        htmlType="submit"
                        icon={<SendOutlined />}
                        loading={savingNote}
                      >
                        Add Note
                      </Button>
                    </Form.Item>
                  </Form>
                </TabPane>
              )}
            </Tabs>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Tags" extra={
            !isReadOnly && (
              <Button 
                size="small" 
                icon={<TagsOutlined />}
                onClick={() => navigate(`/people/${id}/edit`)}
              >
                Manage
              </Button>
            )
          }>
            {personTags.length > 0 ? (
              <div className="space-y-2">
                {personTags.map(tag => (
                  <Tag key={tag._id} color={tag.color || 'default'}>
                    {tag.name}
                  </Tag>
                ))}
              </div>
            ) : (
              <Text type="secondary">No tags</Text>
            )}
          </Card>

          <Card title="Household" extra={
            household && (
              <Button 
                size="small" 
                icon={<HomeOutlined />}
                onClick={() => navigate(`/households/${household._id}`)}
              >
                View
              </Button>
            )
          }>
            {household ? (
              <div>
                <Title level={5}>{household.name}</Title>
                {householdMembers.length > 0 && (
                  <div className="mt-4">
                    <Text strong className="block mb-2">Members:</Text>
                    <div className="space-y-1">
                      {householdMembers.map(member => (
                        <div key={member._id} className="flex justify-between items-center">
                          <Link 
                            to={`/people/${member.personId}`}
                            className={member.personId === id ? 'font-bold' : ''}
                          >
                            {member.person.firstName} {member.person.lastName}
                          </Link>
                          <Tag size="small">{member.relationship}</Tag>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Text type="secondary">Not in a household</Text>
            )}
          </Card>

          <Card title="Quick Actions">
            <div className="space-y-2">
              {!isReadOnly && (
                <>
                  <Button 
                    block 
                    icon={<EditOutlined />}
                    onClick={() => navigate(`/people/${id}/edit`)}
                  >
                    Edit Person
                  </Button>
                  <Button 
                    block 
                    icon={<TagsOutlined />}
                    onClick={() => navigate(`/people/${id}/edit`)}
                  >
                    Manage Tags
                  </Button>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}