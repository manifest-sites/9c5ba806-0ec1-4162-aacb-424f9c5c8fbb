import { useContext, useEffect, useState } from 'react';
import { Card, Statistic, List, Typography, Tag, Spin, Alert } from 'antd';
import { 
  TeamOutlined, 
  UserCheckOutlined, 
  UserDeleteOutlined, 
  ContactsOutlined,
  CalendarOutlined 
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { AppContext } from '../App';
import { Person } from '../entities/Person';
import { Note } from '../entities/Note';
import { Tag as TagEntity } from '../entities/Tag';
import type { Person as PersonType, Note as NoteType, Tag as TagType, ApiResponse } from '../types';

const { Title, Text } = Typography;

interface DashboardStats {
  totalPeople: number;
  activePeople: number;
  inactivePeople: number;
  visitorPeople: number;
  peopleAddedThisMonth: number;
  topTags: (TagType & { count: number })[];
}

export default function Dashboard() {
  const { organizationId } = useContext(AppContext);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>();
  const [recentNotes, setRecentNotes] = useState<NoteType[]>([]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    loadDashboardData();
  }, [organizationId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(undefined);

      const peopleResponse: ApiResponse<PersonType[]> = await Person.list();
      const notesResponse: ApiResponse<NoteType[]> = await Note.list();
      const tagsResponse: ApiResponse<TagType[]> = await TagEntity.list();

      if (!peopleResponse.success || !notesResponse.success || !tagsResponse.success) {
        throw new Error('Failed to load dashboard data');
      }

      const people = peopleResponse.data;
      const notes = notesResponse.data.slice(0, 10);
      const tags = tagsResponse.data;

      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const stats: DashboardStats = {
        totalPeople: people.length,
        activePeople: people.filter(p => p.status === 'active').length,
        inactivePeople: people.filter(p => p.status === 'inactive').length,
        visitorPeople: people.filter(p => p.status === 'visitor').length,
        peopleAddedThisMonth: people.filter(p => new Date(p.createdAt) >= currentMonth).length,
        topTags: tags.map(tag => ({
          ...tag,
          count: people.filter(p => p.tagIds.includes(tag._id)).length
        })).sort((a, b) => b.count - a.count).slice(0, 5)
      };

      setStats(stats);
      setRecentNotes(notes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
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
        message="Error loading dashboard" 
        description={error}
        type="error" 
        showIcon 
        className="mb-6"
      />
    );
  }

  return (
    <div className="space-y-6">
      <Title level={2}>Dashboard</Title>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <Statistic
            title="Total People"
            value={stats?.totalPeople || 0}
            prefix={<TeamOutlined />}
            valueStyle={{ color: '#1890ff' }}
          />
        </Card>
        
        <Card>
          <Statistic
            title="Active"
            value={stats?.activePeople || 0}
            prefix={<UserCheckOutlined />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Card>
        
        <Card>
          <Statistic
            title="Inactive"
            value={stats?.inactivePeople || 0}
            prefix={<UserDeleteOutlined />}
            valueStyle={{ color: '#faad14' }}
          />
        </Card>
        
        <Card>
          <Statistic
            title="Visitors"
            value={stats?.visitorPeople || 0}
            prefix={<ContactsOutlined />}
            valueStyle={{ color: '#722ed1' }}
          />
        </Card>
        
        <Card>
          <Statistic
            title="Added This Month"
            value={stats?.peopleAddedThisMonth || 0}
            prefix={<CalendarOutlined />}
            valueStyle={{ color: '#13c2c2' }}
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Top 5 Tags" className="h-fit">
          {stats?.topTags.length ? (
            <div className="space-y-2">
              {stats.topTags.map(tag => (
                <div key={tag._id} className="flex justify-between items-center">
                  <Tag color={tag.color || 'default'}>
                    {tag.name}
                  </Tag>
                  <Text>{tag.count} people</Text>
                </div>
              ))}
            </div>
          ) : (
            <Text type="secondary">No tags found</Text>
          )}
        </Card>

        <Card title="Recent Notes" className="h-fit">
          {recentNotes.length ? (
            <List
              itemLayout="vertical"
              dataSource={recentNotes}
              renderItem={note => (
                <List.Item key={note._id}>
                  <div>
                    <Text strong>
                      <Link to={`/people/${note.personId}`}>
                        Person #{note.personId.slice(-8)}
                      </Link>
                    </Text>
                    <div className="mt-1">
                      <Text>{note.body}</Text>
                    </div>
                    <div className="mt-2">
                      <Text type="secondary" className="text-xs">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </Text>
                      {note.visibility === 'staff_only' && (
                        <Tag size="small" className="ml-2">Staff Only</Tag>
                      )}
                    </div>
                  </div>
                </List.Item>
              )}
            />
          ) : (
            <Text type="secondary">No recent notes</Text>
          )}
        </Card>
      </div>
    </div>
  );
}