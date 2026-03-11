import { NextResponse } from 'next/server'

export interface ApiSuccess<T> {
  success: true
  data: T
}

export interface ApiError {
  success: false
  code: string
  message: string
  details?: unknown
}

export function successResponse<T>(data: T, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data }, { status })
}

export function errorResponse(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
): NextResponse<ApiError> {
  return NextResponse.json(
    { success: false, code, message, ...(details !== undefined ? { details } : {}) },
    { status },
  )
}

export function unauthorizedResponse(): NextResponse<ApiError> {
  return errorResponse('UNAUTHORIZED', '인증이 필요합니다.', 401)
}

export function forbiddenResponse(): NextResponse<ApiError> {
  return errorResponse('FORBIDDEN', '접근 권한이 없습니다.', 403)
}

export function notFoundResponse(): NextResponse<ApiError> {
  return errorResponse('NOT_FOUND', '리소스를 찾을 수 없습니다.', 404)
}

export function internalErrorResponse(message = '서버 오류가 발생했습니다.'): NextResponse<ApiError> {
  return errorResponse('INTERNAL_ERROR', message, 500)
}

export function validationErrorResponse(details: unknown): NextResponse<ApiError> {
  return errorResponse('VALIDATION_ERROR', '입력값이 올바르지 않습니다.', 400, details)
}
