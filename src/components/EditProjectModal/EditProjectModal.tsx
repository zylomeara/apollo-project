import React, { useCallback, useEffect, useState } from "react";
import { Form, Input, Modal } from "antd";
import { QueryProject } from "../ProjectsTable/ProjectsTable";
import { useCreateProjectMutation, useUpdateProjectMutation } from "../../__generate/graphql-frontend";

interface IProps {
  projectForEdit: QueryProject | null;
  visible: boolean;
  onCancel(): void;
  onOk(): void;
}

export const EditProjectModal = ({projectForEdit, visible, onCancel, onOk}: IProps) => {
  const [projectNameValue, setProjectNameValue] = useState<string | null>(null);
  const [createProjectMutation, {loading: isCreatingProject}] = useCreateProjectMutation();
  const [updateProjectMutation, {loading: isUpdatingProject}] = useUpdateProjectMutation();
  const isEditMode = !!projectForEdit;
  const isValidField = !!projectNameValue;

  const handleSaveProject = useCallback(async () => {
    if (isValidField) {
      if (!isEditMode) {
        await createProjectMutation({
          variables: {
            input: {
              name: projectNameValue,
            }
          }
        });
      } else if (projectForEdit) {
        await updateProjectMutation({
          variables: {
            input: {
              id: projectForEdit.id,
              name: projectNameValue,
            }
          }
        })
      }
    }
    onOk();
  }, [projectNameValue, isValidField, projectForEdit, isEditMode, onOk]);

  useEffect(() => {
    if (!visible) {
      setProjectNameValue(null)
    } else {
      setProjectNameValue(projectForEdit?.name || null);
    }
  }, [visible])

  return (
    // @ts-ignore
    <Modal
      title={!isEditMode ? 'Создание проекта' : 'Редактирование проекта'}
      visible={visible}
      okText="Сохранить"
      cancelText="Отмена"
      onCancel={onCancel}
      okButtonProps={{disabled: !projectNameValue}}
      confirmLoading={isCreatingProject || isUpdatingProject}
      onOk={!!projectNameValue ? handleSaveProject : undefined}
    >
      <Form>
        <Form.Item>
          <Input
            placeholder="Имя проекта"
            value={projectNameValue || ''}
            status={!projectNameValue ? 'error' : ''}
            autoFocus
            onChange={e => setProjectNameValue(e.target.value || null)}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
