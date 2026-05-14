import api from './api'
import type { UserPhotoDto } from '../types/api.types'
import { API_ENDPOINTS } from '../types/api.types'

export interface UserPhotoFiles {
  front: File
  back: File
  left: File
  right: File
}

export async function uploadUserPhotos(
  userId: string,
  files: UserPhotoFiles,
): Promise<UserPhotoDto[]> {
  const fd = new FormData()
  // Dosya alanları — orijinal isim ve content-type FormData üzerinden korunur.
  fd.append('front', files.front, files.front.name)
  fd.append('back', files.back, files.back.name)
  fd.append('left', files.left, files.left.name)
  fd.append('right', files.right, files.right.name)
  // Content-Type'ı override etmiyoruz; axios FormData için doğru boundary'yi
  // otomatik üretiyor (instance default'u request interceptor'ında siliniyor).
  const { data } = await api.post<UserPhotoDto[]>(API_ENDPOINTS.USER_PHOTOS(userId), fd)
  return data
}

export async function getUserPhotos(userId: string): Promise<UserPhotoDto[]> {
  const { data } = await api.get<UserPhotoDto[]>(API_ENDPOINTS.USER_PHOTOS(userId))
  return data
}
