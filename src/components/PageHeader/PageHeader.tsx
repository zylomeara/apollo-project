import { Button, Col, Form, Input, Modal, Row } from "antd";
import React, { useState } from "react";
import { useSwitcher } from "../../utils/hooks";

interface IProps {
  onLogin(appKey: string | null, appSecret: string | null): void;
}

export const PageHeader = ({onLogin}: IProps) => {
  const [isShowAuthModal, showAuthModal, hideAuthModal] = useSwitcher();
  const [appKey, setAppKey] = useState<string | null>(localStorage.getItem("appKey"));
  const [appSecret, setAppSecret] = useState<string | null>(localStorage.getItem("appSecret"));

  return (
    <Row>
      <Col offset={21} span={3}>
        <Button onClick={showAuthModal}>
          Аутентификация
        </Button>
        {/*@ts-ignore*/}
        <Modal
          title="Аутентификация"
          visible={isShowAuthModal}
          okText="Применить"
          cancelText="Отмена"
          onCancel={hideAuthModal}
          onOk={() => {
            localStorage.setItem("appKey", appKey || '');
            localStorage.setItem("appSecret", appSecret || '');
            hideAuthModal();
            onLogin(appKey, appSecret);
          }}
        >
          <Form>
            <Form.Item>
              <Input
                placeholder="App"
                value={appKey || ''}
                onChange={e => setAppKey(e.target.value || null)}
              />
            </Form.Item>
            <Form.Item>
              <Input.Password
                placeholder="Service secret"
                value={appSecret || ''}
                onChange={e => setAppSecret(e.target.value || null)}
              />
            </Form.Item>
          </Form>
        </Modal>
      </Col>
    </Row>
  );
}
