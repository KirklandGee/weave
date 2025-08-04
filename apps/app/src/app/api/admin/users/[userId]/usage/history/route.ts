import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: clerkUserId, getToken } = await auth()
    
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params

    // Only allow users to access their own usage data
    if (clerkUserId !== resolvedParams.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '50'
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    // Get the JWT token to pass to backend
    const token = await getToken()
    if (!token) {
      return NextResponse.json({ error: 'No token available' }, { status: 401 })
    }

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
    const queryParams = new URLSearchParams({ limit })
    
    if (startDate) queryParams.append('start_date', startDate)
    if (endDate) queryParams.append('end_date', endDate)

    const response = await fetch(`${backendUrl}/admin/users/${resolvedParams.userId}/usage/history?${queryParams}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch usage history' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching usage history:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}