import React, { useState } from 'react'
import { Layout } from 'antd';
import './App.css';
import ProjectsTable from '../ProjectsTable/ProjectsTable';
import { PageHeader } from "../PageHeader/PageHeader";

const { Header, Content } = Layout;

export const App = () => {
  const [appKey, setAppKey] = useState<string | null>(localStorage.getItem("appKey"));
  const [appSecret, setAppSecret] = useState<string | null>(localStorage.getItem("appSecret"));

  return (
    <Layout>
      <Header className="Header">
        <PageHeader onLogin={(key, secret) => {
          setAppKey(key);
          setAppSecret(secret);
        }}/>
      </Header>
      <Content className="Content">
        <ProjectsTable appKey={appKey} appSecret={appSecret} />
      </Content>
    </Layout>
  )
}
