export function successResponse(data: any, message = 'Success') {
  return { success: true, message, data };
}

export function paginatedResponse(data: any, page: number, limit: number, total: number) {
  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
