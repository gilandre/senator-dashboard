import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { test, expect } from '@jest/globals';
import supertest from 'supertest';

const request = supertest('http://localhost:3000');

describe('API Integration Tests', () => {
  let testConfigId;

  // Test GET/PUT for attendance configuration
  test('Verify attendance config consistency', async () => {
    // Test PUT
    const putResponse = await request
      .put('/api/config/attendance')
      .send({
        startHour: '08:00',
        endHour: '18:00',
        dailyHours: 8.5,
        lunchBreak: true,
        updatedBy: 'integration-test'
      });

    expect(putResponse.status).toBe(200);
    testConfigId = putResponse.body.id;

    // Test GET
    const getResponse = await request.get('/api/config/attendance');
    
    expect(getResponse.status).toBe(200);
    expect(getResponse.body).toMatchObject({
      startHour: '08:00',
      endHour: '18:00',
      dailyHours: 8.5
    });

    // Verify database directly
    const dbRecord = await prisma.attendance_parameters.findUnique({
      where: { id: testConfigId }
    });

    expect(dbRecord).toBeTruthy();
    expect(dbRecord.start_hour).toBe('08:00');
  });

  // Test user activities endpoints
  test('Verify user activities lifecycle', async () => {
    // Create test activity
    const postResponse = await request
      .post('/api/user-activities')
      .send({
        userId: 1,
        action: 'TEST_ACTION',
        details: 'Integration test details'
      });

    expect(postResponse.status).toBe(201);
    const activityId = postResponse.body.id;

    // Verify GET endpoint
    const getResponse = await request.get(`/api/user-activities?userId=1`);
    
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.some((a: any) => a.id === activityId)).toBe(true);

    // Verify database record
    const dbRecord = await prisma.user_activities.findUnique({
      where: { id: parseInt(activityId) }
    });

    expect(dbRecord).toBeTruthy();
    expect(dbRecord?.action).toBe('TEST_ACTION');
  });

  afterAll(async () => {
    // Cleanup
    if(testConfigId) {
      await prisma.attendance_parameters.delete({
        where: { id: testConfigId }
      });
    }
    
    // Cleanup user activities
    await prisma.user_activities.deleteMany({
      where: { action: 'TEST_ACTION' }
    });
  });
});