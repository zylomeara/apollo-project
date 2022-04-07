import React, { useCallback, useEffect, useState } from "react";
import { QueryTask } from "../ProjectTasksDrawer/ProjectTasksDrawer";
import { Form, Input, Modal } from "antd";
import { useCreateTaskMutation, useUpdateTaskMutation } from "../../__generate/graphql-frontend";
import { QueryProject } from "../ProjectsTable/ProjectsTable";

interface IProps {
  selectedTask: QueryTask | null;
  selectedProject: QueryProject;
  visible: boolean;

  onCancel(): void;

  onOk(): void;
}

export const EditTaskModal = ({ selectedTask, visible, onCancel, onOk, selectedProject }: IProps) => {
  const [title, setTitle] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const isEditMode = !!selectedTask;
  const isValidFields = !!title;

  const [createTaskMutation, {loading: isCreatingTask}] = useCreateTaskMutation()
  const [updateTaskMutation, {loading: isUpdatingTask}] = useUpdateTaskMutation()

  const handleSaveTask = useCallback(async () => {
    if (isValidFields) {
      if (!isEditMode) {
        await createTaskMutation({
          variables: {
            input: {
              title,
              project: selectedProject.id,
              ...!!description && { description }
            }
          }
        })
      } else if (isEditMode) {
        await updateTaskMutation({
          variables: {
            input: {
              id: selectedTask.id,
              title,
              ...!!description && { description }
            }
          }
        })
      }
      onOk();
    }
  }, [isEditMode, selectedProject, selectedTask, title, description, onOk]);

  useEffect(() => {
    if (!visible) {
      setTitle(null)
      setDescription(null)
    } else {
      setTitle(selectedTask?.title || null)
      setDescription(selectedTask?.description || null)
    }
  }, [visible]);

  return (
    // @ts-ignore
    <Modal
      title={!isEditMode ? 'Создание задачи' : 'Редактирование задачи'}
      visible={visible}
      okText="Сохранить"
      cancelText="Отмена"
      onCancel={onCancel}
      okButtonProps={{ disabled: !isValidFields }}
      confirmLoading={isCreatingTask || isUpdatingTask}
      onOk={isValidFields ? handleSaveTask : undefined}
    >
      <Form>
        <Form.Item>
          <Input
            placeholder="Заголовок задачи"
            value={title || ''}
            status={!title ? 'error' : ''}
            autoFocus
            onChange={e => setTitle(e.target.value || null)}
          />
        </Form.Item>
        <Form.Item>
          <Input
            placeholder="Описание"
            value={description || ''}
            onChange={e => setDescription(e.target.value || null)}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
