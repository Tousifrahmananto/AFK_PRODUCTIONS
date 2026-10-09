import axios from "axios";
import { API_ORIGIN as API } from "./apiConfig";

export function getUnreadCount(token) {
  return axios
    .get(`${API}/api/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then(r => r.data);
}

export function getNotifications(token) {
  return axios
    .get(`${API}/api/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then(r => r.data);
}

export function markRead(id, token) {
  return axios
    .post(`${API}/api/notifications/${id}/read`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then(r => r.data);
}

export function markAllRead(token) {
  return axios
    .post(`${API}/api/notifications/read-all`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then(r => r.data);
}

export function deleteNotification(id, token) {
  return axios
    .delete(`${API}/api/notifications/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then(r => r.data);
}
