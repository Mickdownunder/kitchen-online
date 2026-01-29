import swaggerJsdoc from 'swagger-jsdoc'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const options: swaggerJsdoc.Options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'KüchenProfi Manager API',
        version: '1.0.0',
        description:
          'API Documentation for KüchenProfi Manager - A professional kitchen manufacturing management system',
        contact: {
          name: 'API Support',
        },
      },
      servers: [
        {
          url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
    },
    apis: ['./app/api/**/*.ts', './docs/api/**/*.yaml'],
  }

  try {
    const swaggerSpec = swaggerJsdoc(options)
    return NextResponse.json(swaggerSpec, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Error generating Swagger spec:', error)
    return NextResponse.json({ error: 'Failed to generate API documentation' }, { status: 500 })
  }
}
