import { rsqlStringToQuery } from '../src';

describe('adapt', () => {
  const sut = (expression: string) =>
    rsqlStringToQuery<{ name: string }>(expression);
  /**/
  it('should be create equals compare', () => {
    expect(sut('name==John')).toMatchObject({
      name: { $eq: 'John' },
    });
  });

  it('should be create more than compare', () => {
    expect(sut('age>18')).toMatchObject({
      age: { $gt: '18' },
    });
  });

  it('should be create more than equal compare', () => {
    expect(sut('age>=18')).toMatchObject({
      age: { $gte: '18' },
    });
    expect(sut('createdAt>=1970-01-01T15:00:00.000Z')).toMatchObject({
      createdAt: { $gte: new Date('1970-01-01T15:00:00.000Z') },
    });
  });

  it('should be create less than compare', () => {
    expect(sut('age<18')).toMatchObject({
      age: { $lt: '18' },
    });
  });

  it('should be create less than or equal compare', () => {
    expect(sut('age<=18')).toMatchObject({
      age: { $lte: '18' },
    });
  });

  it('should create not equal comparison', () => {
    expect(sut('age!=18')).toMatchObject({
      age: { $ne: '18' },
    });
  });

  it('should create not like comparison', () => {
    expect(sut('age!=*18*')).toMatchObject({
      $not: {
        age: { $like: '%18%' },
      },
    });
  });

  it('should be in compare', () => {
    expect(sut('name=in=(John,Doe)')).toMatchObject({
      name: { $in: ['John', 'Doe'] },
    });
  });

  it('should be not in compare', () => {
    expect(sut('name=out=(John,Doe)')).toMatchObject({
      name: { $nin: ['John', 'Doe'] },
    });
  });

  it('should be like compare', () => {
    expect(sut('name==*John')).toMatchObject({
      name: { $like: '%John' },
    });
    expect(sut('name==John*')).toMatchObject({
      name: { $like: 'John%' },
    });
    expect(sut('name==*John*')).toMatchObject({
      name: { $like: '%John%' },
    });
  });

  it('should be and compare', () => {
    expect(sut('name==John;age==18;id==2')).toMatchObject({
      $and: [
        {
          name: { $eq: 'John' },
          age: { $eq: '18' },
          id: { $eq: '2' },
        },
      ],
    });
    expect(sut('name==John*;age<18')).toMatchObject({
      $and: [
        {
          name: { $like: 'John%' },
          age: { $lt: '18' },
        },
      ],
    });
  });

  it('should be or compare', () => {
    expect(sut('name==John,age==18,id==2')).toMatchObject({
      $or: [
        {
          name: { $eq: 'John' },
          age: { $eq: '18' },
          id: { $eq: '2' },
        },
      ],
    });
    expect(sut('name==John*,age<18')).toMatchObject({
      $or: [
        {
          name: { $like: 'John%' },
          age: { $lt: '18' },
        },
      ],
    });
  });

  it('should be able to perform the operation AND inside operation OR', () => {
    expect(
      sut(
        'franchiseId==1;type==franchise_employee,franchiseId==1;type==franchise_owner'
      )
    ).toMatchObject({
      $or: [
        {
          $and: [
            {
              franchiseId: { $eq: '1' },
              type: { $eq: 'franchise_employee' },
            },
          ],
        },
        {
          $and: [
            {
              franchiseId: { $eq: '1' },
              type: { $eq: 'franchise_owner' },
            },
          ],
        },
      ],
    });
  });

  it('should be can filter relation items', () => {
    expect(sut('address.state==Italy;address.city==Naples')).toMatchObject({
      $and: [
        {
          address: {
            state: { $eq: 'Italy' },
            city: { $eq: 'Naples' },
          },
        },
      ],
    });
    expect(
      sut('price.amount>20;name==Pizza;price.currency==EUR')
    ).toMatchObject({
      $and: [
        {
          name: { $eq: 'Pizza' },
          price: {
            amount: { $gt: '20' },
            currency: { $eq: 'EUR' },
          },
        },
      ],
    });
    expect(
      sut('roles.name==Admin;roles.permission.name==Create')
    ).toMatchObject({
      $and: [
        {
          roles: {
            name: { $eq: 'Admin' },
            permission: {
              name: { $eq: 'Create' },
            },
          },
        },
      ],
    });
  });

  it('should be able to perform the operation AND in the same field', () => {
    expect(sut('amount>0;amount<20')).toMatchObject({
      $and: [{ amount: { $gt: '0', $lt: '20' } }],
    });
  });

  it('should be able to perform the operation OR inside operation AND', () => {
    expect(
      sut(
        'age>18;(nome==John*;cognome==Travolta*,nome==Travolta*;cognome==John*)'
      )
    ).toMatchObject({
      $and: [
        {
          age: { $gt: '18' },
          $or: [
            {
              $and: [
                {
                  cognome: { $like: 'Travolta%' },
                  nome: { $like: 'John%' },
                },
              ],
            },
            {
              $and: [
                {
                  cognome: { $like: 'John%' },
                  nome: { $like: 'Travolta%' },
                },
              ],
            },
          ],
        },
      ],
    });
  });
});
