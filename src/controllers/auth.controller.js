import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import jwksClient from 'jwks-rsa';
import dotenv from 'dotenv';
import db from '../../lib/db.js';
import { v4 as uuidv4 } from 'uuid';
import { and, ilike, eq, count, or, inArray, isNull, is } from 'drizzle-orm';
import { users, services, userServices, userFcmTokens } from '../../drizzle/schema.js';
import { sendVerificationEmail } from "../services/email.service.js";
import { randomBytes } from "crypto";
dotenv.config();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
const appleJwks = jwksClient({ jwksUri: 'https://appleid.apple.com/auth/keys' })
const TOKEN_EXPIRES_IN = '7d'

function splitFullName(fullname) {
  const parts = fullname.trim().split(/\s+/);

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }

  const lastName = parts.pop();
  const firstName = parts.join(' ');

  return { firstName, lastName };
}

function buildFullName(user) {
  return `${user.firstName} ${user.lastName}`.trim();
}

export const requestEmailVerification = async (req, res) => {
  try {
    const { email } = req.body;

    // generate 6 digit numeric code
    const token = Math.floor(100000 + Math.random() * 900000).toString();

    // simpan ke user row
    await db.update(users).set({ verificationToken: token }).where(eq(users.email, email));

    await sendVerificationEmail(email, token);

    res.json({ status: 200, message: "Verification code sent to email" });
  } catch (err) {
    res.status(500).json({ message: "Failed to send email", error: err.message });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { email, token } = req.body;

    const result = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.verificationToken, token), isNull(users.deletedAt)));

    if (!result.length) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    const user = result[0];

    await db.update(users)
      .set({ isEmailVerified: true, verificationToken: null })
      .where(eq(users.id, user.id));

    res.json({ status: 200, message: "Email verified successfully" });
  } catch (err) {
    res.status(500).json({ message: "Verification failed", error: err.message });
  }
};

function generateToken(user) {
  const JWT_SECRET = process.env.JWT_SECRET
  return jwt.sign(
    { id: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRES_IN }
  )
}


export const getAllServices = async (req, res) => {
  try {
    const result = await db.select().from(services)
    res.json({ status: 200, message: 'Success', results: result })
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch services', error: err.message })
  }
}

export const login = async (req, res) => {
  const { email, password, fcmToken } = req.body
  if (!email || !password) {
    return res.status(400).json({ status: 400, message: 'Email and password are required.', results: null })
  }
  const result = await db.select().from(users).where(and(eq(users.email, email), isNull(users.deletedAt)))
  const user = result[0]

  if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ status: 401, message: 'Invalid credentials.', results: null })
  }

  if (!user.canAccessCMS) {
    return res.status(403).json({ status: 403, message: 'Access denied.', results: null })
  }

  const token = generateToken(user)
  
  user.fullname = buildFullName(user);
  delete user.firstName;
  delete user.lastName;

  if (fcmToken) {
    const existing = await db
      .select()
      .from(userFcmTokens)
      .where(and(
        eq(userFcmTokens.userId, user.id),
        eq(userFcmTokens.token, fcmToken)
      ))
      .get(); // single object atau undefined

    if (!existing) {
      await db.insert(userFcmTokens).values({
        userId: user.id,
        token: fcmToken,
      });
    }
  }
  res.json({ status: 200, message: 'Login successful', results: { token, user } })
}


function getAppleKey(header, callback) {
  appleJwks.getSigningKey(header.kid, (err, key) => {
    const signingKey = key.getPublicKey()
    callback(null, signingKey)
  })
}

export const oauthLogin = async (req, res) => {
  const { provider, id_token, fcmToken } = req.body;

  if (provider === 'google') {
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: id_token,
        audience: [
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_ID_ANDROID
        ]
      });

      const payload = ticket.getPayload();
      const { sub, email, given_name, family_name } = payload;

      let user = (
        await db.select().from(users).where(eq(users.providerId, sub))
      )[0];

      if (!user) {
        user = (
          await db.select().from(users).where(eq(users.email, email))
        )[0];

        if (user) {
          await db.update(users)
            .set({ provider: 'google', providerId: sub })
            .where(eq(users.id, user.id));

          user.provider = 'google';
          user.providerId = sub;
        } else {
          const insertResult = await db.insert(users).values({
            id: uuidv4(),
            firstName: given_name,
            lastName: family_name || '',
            email,
            provider: 'google',
            providerId: sub,
            role: 'USER',
            isEmailVerified: true
          }).returning();
          user = insertResult[0];
        }
      }

      // Save FCM if needed
      if (fcmToken) {
        const existingArr = await db.select().from(userFcmTokens).where(
          and(
            eq(userFcmTokens.userId, user.id),
            eq(userFcmTokens.token, fcmToken)
          )
        );

        if (existingArr.length === 0) {
          await db.insert(userFcmTokens).values({
            userId: user.id,
            token: fcmToken
          });
        }
      }

      // Convert output → fullname
      user.fullname = buildFullName(user);
      delete user.firstName;
      delete user.lastName;

      const token = generateToken(user);

      return res.json({
        status: 200,
        message: 'OAuth login successful',
        results: { token, user }
      });
    } catch (error) {
      console.error(error);
      return res.status(401).json({
        status: 401,
        message: 'Invalid Google token.',
        results: null
      });
    }
  }

  // ---------------- APPLE -----------------
  if (provider === 'apple') {
    jwt.verify(
      id_token,
      getAppleKey,
      { algorithms: ['RS256'] },
      async (err, payload) => {
        if (err) {
          console.error(err);
          return res.status(401).json({
            status: 401,
            message: 'Invalid Apple token',
            results: null
          });
        }

        const { sub, email } = payload;

        let user = (
          await db.select().from(users).where(eq(users.providerId, sub))
        )[0];

        if (!user) {
          const insertResult = await db.insert(users).values({
            firstName: 'Apple',
            lastName: 'User',
            email,
            provider: 'apple',
            providerId: sub,
            role: 'USER',
            isEmailVerified: true
          }).returning();

          user = insertResult[0];
        }

        // Save FCM if needed
        if (fcmToken) {
          const existingArr = await db.select().from(userFcmTokens).where(
            and(
              eq(userFcmTokens.userId, user.id),
              eq(userFcmTokens.token, fcmToken)
            )
          );

          if (existingArr.length === 0) {
            await db.insert(userFcmTokens).values({
              userId: user.id,
              token: fcmToken
            });
          }
        }

        // Convert output → fullname
        user.fullname = buildFullName(user);
        delete user.firstName;
        delete user.lastName;

        const token = generateToken(user);

        return res.json({
          status: 200,
          message: 'OAuth login successful',
          results: { token, user }
        });
      }
    );
  } else {
    return res.status(400).json({
      status: 400,
      message: 'Unsupported provider.',
      results: null
    });
  }
};


export const register = async (req, res) => { 
  const { 
    fullname,
    email, 
    password, 
    mobileNumber,
    role, 
    fcmToken 
  } = req.body; 
  
  if ( 
    !email || 
    !password || 
    !fullname
    ) { 
      return res.status(400).json({ 
        status: 400, 
        message: 'Missing or invalid required fields.', 
        results: null, 
      }); 
    } 

    const { firstName, lastName } = splitFullName(fullname);
    
    const existing = (await db.select().from(users).where(eq(users.email, email)))[0]; 
    if (existing) { 
      return res.status(409).json({ status: 409, message: 'Email already registered.', results: null, }); 
    } 
    
    let newRole = 'USER'; 
    if (role === 'ADMIN') { 
      const requester = req.user; 
      if (!requester || requester.role !== 'ADMIN') { 
        return res.status(403).json({ status: 403, message: 'Only admins can assign ADMIN role.', results: null, }); 
      } 
      newRole = 'ADMIN'; 
    } 
    
    const hashed = await bcrypt.hash(password, 10); 
    const userId = uuidv4(); 
    
    const insertResult = await db.insert(users).values({ 
      id: userId, 
      firstName, 
      lastName, 
      email, 
      mobileNumber, 
      password: hashed, 
      role: newRole, 
      provider: null, 
      providerId: null, 
      emailVerifiedAt: null, 
    }).returning(); 
      
    if (fcmToken) { 
      const existingArr = await db.select()
      .from(userFcmTokens)
      .where(and( eq(userFcmTokens.userId, insertResult[0].id), eq(userFcmTokens.token, fcmToken) )) 

      if (existingArr.length === 0) { 
        await db.insert(userFcmTokens)
        .values({ userId: insertResult[0].id, token: fcmToken, });
      } 
    } 

    const user = insertResult[0];
    user.fullname = buildFullName(user);

    delete user.firstName;
    delete user.lastName;
    const { password: _, ...userWithoutPassword } = insertResult[0]; 
    const token = generateToken(userWithoutPassword); 
    
    res.status(201).json({
       status: 201, 
       message: 'Registration successful', 
       results: { 
          token, 
          user: userWithoutPassword, 
        },
    }); 
};

export const editUser = async (req, res) => {
  const targetUserId = req.params.id;

  const {
    fullname,
    email,
    mobileNumber,
    password,
    canAccessCMS,
    role,
    serviceIds
  } = req.body;
  
  const updates = {};
  if (req.body.fullname) {
    const { firstName, lastName } = splitFullName(req.body.fullname);

    updates.firstName = firstName;
    updates.lastName = lastName;
  }
  if (email) updates.email = email;
  if (mobileNumber) updates.mobileNumber = mobileNumber;
  if (typeof canAccessCMS === 'boolean') updates.canAccessCMS = canAccessCMS;
  if (role) updates.role = role;

  if (password) {
    updates.password = await bcrypt.hash(password, 10);
  }

  // Tambahkan updatedAt
  updates.updatedAt = new Date();

  console.log('Updating user:', targetUserId);
  console.log('Updates:', updates);
  console.log('Service IDs:', serviceIds);

  // Jangan update jika tidak ada field valid
  if (Object.keys(updates).length === 0 && !Array.isArray(serviceIds)) {
    return res.status(400).json({
      status: 400,
      message: 'No valid fields provided for update',
      results: null
    });
  }

  // Update user
  await db.update(users).set(updates).where(eq(users.id, targetUserId));

  // Update relasi ke services jika ada
  if (Array.isArray(serviceIds)) {
    const validServices = await db
      .select()
      .from(services)
      .where(inArray(services.id, serviceIds.map(Number))); // <== pastikan integer

    if (validServices.length !== serviceIds.length) {
      return res.status(400).json({
        status: 400,
        message: 'Some serviceIds are invalid',
        results: null
      });
    }

    await db.delete(userServices).where(eq(userServices.userId, targetUserId));
    await db.insert(userServices).values(
      serviceIds.map(serviceId => ({
        userId: targetUserId,
        serviceId: Number(serviceId)
      }))
    );
  }

  return res.status(200).json({
    status: 200,
    message: 'User updated successfully',
    results: null
  });
};


export const userLogin = async (req, res) => {
  const { email, password, fcmToken } = req.body

  if (!email || !password) {
    return res.status(400).json({ status: 400, message: 'Email and password are required.', results: null })
  }

  const result = await db.select().from(users).where(and(eq(users.email, email), isNull(users.deletedAt)))
  const user = result[0]

  if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ status: 401, message: 'Invalid credentials.', results: null })
  }

  if (user.role !== 'USER') {
    return res.status(403).json({ status: 403, message: 'Not allowed for non-user role.', results: null })
  }

  const token = generateToken(user)
  if (fcmToken) {
    const existingArr = await db.select().from(userFcmTokens).where(and(
        eq(userFcmTokens.userId, user.id),
        eq(userFcmTokens.token, fcmToken)
      ))

    if (existingArr.length === 0) {
      await db.insert(userFcmTokens).values({
        userId: user.id,
        token: fcmToken,
      });
    }
  }
  res.json({ status: 200, message: 'Login successful', results: { token, user } })
}

export const getProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: 401,
        message: 'Unauthorized: No user info in token',
        results: null,
      });
    }

    const userId = req.user.id;

    // Ambil data user dasar
    const result = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        mobileNumber: users.mobileNumber,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)));

    const user = result[0];

    if (!user) {
      return res.status(404).json({
        status: 404,
        message: 'User not found',
        results: null,
      });
    }

    const userServicesResult = await db
      .select({
        id: services.id,
        name: services.name,
      })
      .from(userServices)
      .leftJoin(services, eq(userServices.serviceId, services.id))
      .where(eq(userServices.userId, userId));

    const servicesList = userServicesResult.map((s) => ({
      id: s.id,
      name: s.name,
    }));

    const fullname = buildFullName(user);;

    res.json({
      status: 200,
      message: 'Profile fetched successfully',
      results: {
        ...user,
        fullname,
        firstName: undefined,
        lastName: undefined,
        services: servicesList,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 500,
      message: 'Internal server error',
      results: null,
    });
  }
};


export const listUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search?.toLowerCase() || '';
    const roleFilter = req.query.role?.toUpperCase();

    const offset = (page - 1) * limit;

    // Build filters
    const filters = [];
    if (search) {
      filters.push(
        or(
          ilike(users.firstName, `%${search}%`),
          ilike(users.lastName, `%${search}%`),
          ilike(users.email, `%${search}%`)
        )
      );
    }
    if (roleFilter) {
      filters.push(eq(users.role, roleFilter));
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    const totalQuery = await db
      .select({ count: count() })
      .from(users)
      .where(whereClause);

    const total = parseInt(totalQuery[0].count);

    const rawUsers = await db
      .select()
      .from(users)
      .where(whereClause)
      .limit(limit)
      .offset(offset);

    const userIds = rawUsers.map(u => u.id);

    const serviceMappings = await db
      .select({
        userId: userServices.userId,
        serviceId: services.id,
        serviceName: services.name
      })
      .from(userServices)
      .where(inArray(userServices.userId, userIds))
      .innerJoin(services, eq(userServices.serviceId, services.id));

    const usersWithServices = rawUsers.map(user => {
      const services = serviceMappings
        .filter(s => s.userId === user.id)
        .map(s => ({
          id: s.serviceId,
          name: s.serviceName
        }));

      const { password, ...userWithoutPassword } = user;

      return {
        ...userWithoutPassword,
        fullname: buildFullName(user),
        firstName: undefined,
        lastName: undefined,
        services
      };
    });

    res.json({
      status: 200,
      message: 'Success',
      results: {
        data: usersWithServices,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 500,
      message: 'Internal server error',
      results: null
    });
  }
};


export const deleteUser = async (req, res) => {
  const userId = req.params.id;
  const currentUser = req.user;
  try {
    if (currentUser.role !== 'ADMIN') {
      return res.status(403).json({
        status: 403,
        message: 'Only admins can delete users',
        results: null,
      });
    }

    if (currentUser.id === userId) {
      return res.status(400).json({
        status: 400,
        message: 'You cannot delete your own account.',
        results: null,
      });
    }

    await db.delete(userServices).where(eq(userServices.userId, userId));

    const deleted = await db.delete(users).where(eq(users.id, userId));

    res.json({
      status: 200,
      message: 'User deleted successfully',
      results: null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 500,
      message: 'Internal server error',
      results: null,
    });
  }
};

export const editPassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const { id } = req.params;

  const userResult = await db
    .select()
    .from(users)
    .where(and(eq(users.id, id), isNull(users.deletedAt)));

  if (!userResult.length) {
    return res.status(404).json({ message: 'User not found or deleted' });
  }

  const user = userResult[0];
  const match = await bcrypt.compare(oldPassword, user.password);
  if (!match) {
    return res.status(400).json({ message: 'Old password incorrect' });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await db.update(users).set({ password: hashed }).where(eq(users.id, id));

  return res.json({ message: 'Password updated successfully' });
};

export const softDeleteUser = async (req, res) => {
  const { id } = req.params;
  console.log(id)
  const user = await db
    .select()
    .from(users)
    .where(and(eq(users.id, id), isNull(users.deletedAt)));

  if (!user.length) {
    return res.status(404).json({
      status: 404,
      message: 'User not found or already deleted',
    });
  }

  await db
    .update(users)
    .set({ deletedAt: new Date() })
    .where(eq(users.id, id));

  return res.json({
    status: 200,
    message: 'User deleted successfully',
  });
};

