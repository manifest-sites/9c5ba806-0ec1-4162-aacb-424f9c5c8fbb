import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Layout, Menu, Select, Typography, Avatar } from 'antd';
import { 
  DashboardOutlined, 
  TeamOutlined, 
  HomeOutlined, 
  TagsOutlined, 
  SettingOutlined,
  UserOutlined
} from '@ant-design/icons';
import Monetization from './components/monetization/Monetization';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import Dashboard from './components/Dashboard';
import People from './components/People';
import PeopleList from './components/people/PeopleList';
import PersonProfile from './components/people/PersonProfile';
import PersonForm from './components/people/PersonForm';
import ImportExport from './components/people/ImportExport';
import Households from './components/Households';
import HouseholdList from './components/households/HouseholdList';
import HouseholdDetail from './components/households/HouseholdDetail';
import Tags from './components/Tags';
import Settings from './components/Settings';
import ProfileFields from './components/settings/ProfileFields';
import { getRouterBasename } from './utils/routerUtils';
import type { Organization, OrgMember } from './types';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

interface AppContextType {
  organizationId: string;
  userRole: 'owner' | 'admin' | 'member' | 'viewer';
  currentOrg?: Organization;
  organizations: Organization[];
}

export const AppContext = createContext<AppContextType>({
  organizationId: '',
  userRole: 'viewer',
  organizations: []
});

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [currentOrg, setCurrentOrg] = useState<Organization>();
  
  const organizations: Organization[] = [
    { _id: '1', name: 'First Baptist Church', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' }
  ];
  
  const organizationId = '1';
  const userRole: 'owner' | 'admin' | 'member' | 'viewer' = 'admin';

  useEffect(() => {
    setCurrentOrg(organizations.find(org => org._id === organizationId));
  }, [organizationId]);

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/people',
      icon: <TeamOutlined />,
      label: 'People',
      children: [
        {
          key: '/people/list',
          label: 'All People',
        },
        {
          key: '/people/import-export',
          label: 'Import / Export',
        },
      ],
    },
    {
      key: '/households',
      icon: <HomeOutlined />,
      label: 'Households',
    },
    {
      key: '/tags',
      icon: <TagsOutlined />,
      label: 'Tags',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      children: [
        {
          key: '/settings/profile-fields',
          label: 'Profile Fields',
        },
      ],
    },
  ];

  return (
    <Monetization>
      <ErrorBoundary>
        <AppContext.Provider value={{ organizationId, userRole, currentOrg, organizations }}>
          <ConfigProvider>
          <Router basename={getRouterBasename()}>
            <Layout style={{ minHeight: '100vh' }}>
              <Header className="bg-white border-b border-gray-200 px-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Title level={4} className="!mb-0 !text-gray-800">
                    {currentOrg?.name || 'Church CRM'}
                  </Title>
                </div>
                <div className="flex items-center space-x-4">
                  <Select
                    value={organizationId}
                    style={{ width: 200 }}
                    placeholder="Select Organization"
                    options={organizations.map(org => ({
                      value: org._id,
                      label: org.name
                    }))}
                  />
                  <Avatar icon={<UserOutlined />} />
                </div>
              </Header>
              
              <Layout>
                <Sider
                  collapsible
                  collapsed={collapsed}
                  onCollapse={setCollapsed}
                  width={256}
                  className="bg-white border-r border-gray-200"
                >
                  <Menu
                    mode="inline"
                    defaultSelectedKeys={['/']}
                    items={menuItems}
                    className="border-r-0"
                  />
                </Sider>
                
                <Content className="p-6 bg-gray-50">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/people" element={<Navigate to="/people/list" replace />} />
                    <Route path="/people/list" element={<PeopleList />} />
                    <Route path="/people/new" element={<PersonForm />} />
                    <Route path="/people/import-export" element={<ImportExport />} />
                    <Route path="/people/:id" element={<PersonProfile />} />
                    <Route path="/people/:id/edit" element={<PersonForm />} />
                    <Route path="/households" element={<Navigate to="/households/list" replace />} />
                    <Route path="/households/list" element={<HouseholdList />} />
                    <Route path="/households/:id" element={<HouseholdDetail />} />
                    <Route path="/tags" element={<Tags />} />
                    <Route path="/settings" element={<Navigate to="/settings/profile-fields" replace />} />
                    <Route path="/settings/profile-fields" element={<ProfileFields />} />
                  </Routes>
                </Content>
              </Layout>
            </Layout>
          </Router>
          </ConfigProvider>
        </AppContext.Provider>
      </ErrorBoundary>
    </Monetization>
  );
}

export default App;