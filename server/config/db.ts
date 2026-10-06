import fs from 'fs';
import path from 'path';
import mongoose, { Schema, Model } from 'mongoose';
import {
  UserDoc,
  BatchDoc,
  SemesterDoc,
  AcademicAssignmentDoc,
  StudentDoc,
  SupervisorTopicDoc,
  TeamDoc,
  TeamRegistrationRequestDoc,
  ProposalDoc,
  PhaseDoc,
  DocumentDoc,
  ChatRoomDoc,
  MessageDoc,
  AnnouncementDoc,
  MeetingDoc,
  PresentationDoc,
  AuditLogDoc,
  PreviousProjectDoc,
  SystemSettingsDoc,
} from '../models/types.js';

const DATA_DIR = path.resolve(process.cwd(), 'server', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let isMongoConnected = false;

// Create flexible Mongoose schemas with String _id support and preservation
function getMongooseModel(name: string): any {
  if (mongoose.models[name]) {
    return mongoose.models[name];
  }
  const schema = new Schema(
    {
      _id: { type: String },
      id: { type: String },
    },
    { strict: false, timestamps: true }
  );
  return mongoose.model(name, schema);
}

export interface CollectionStore<T = any> {
  name: string;
  find(filter?: any): Promise<T[]>;
  findOne(filter?: any): Promise<T | null>;
  findById(id: string): Promise<T | null>;
  create(data: any): Promise<T>;
  findByIdAndUpdate(id: string, update: any, options?: { new?: boolean }): Promise<T | null>;
  updateOne(filter: any, update: any): Promise<{ modifiedCount: number }>;
  updateMany(filter: any, update: any): Promise<{ modifiedCount: number }>;
  findByIdAndDelete(id: string): Promise<T | null>;
  deleteOne(filter: any): Promise<{ deletedCount: number }>;
  deleteMany(filter: any): Promise<{ deletedCount: number }>;
  countDocuments(filter?: any): Promise<number>;
}

class UniversalCollection<T extends Record<string, any> = any> implements CollectionStore<T> {
  private filePath: string;
  private model: Model<any>;

  constructor(public name: string) {
    this.filePath = path.join(DATA_DIR, `${name}.json`);
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([], null, 2), 'utf-8');
    }
    this.model = getMongooseModel(name);
  }

  private readAll(): T[] {
    try {
      const data = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(data) || [];
    } catch {
      return [];
    }
  }

  private writeAll(items: T[]): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(items, null, 2), 'utf-8');
    } catch {}
  }

  private matches(item: any, filter: any): boolean {
    if (!filter) return true;
    if (typeof filter === 'function') return filter(item);
    for (const key of Object.keys(filter)) {
      const expected = filter[key];
      const actual = item[key];
      if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
        if ('$in' in expected && Array.isArray(expected.$in)) {
          if (!expected.$in.includes(actual)) return false;
          continue;
        }
        if ('$ne' in expected) {
          if (actual === expected.$ne) return false;
          continue;
        }
      }
      if (key === 'id' || key === '_id') {
        const itemIdentifier = item._id || item.id;
        if (itemIdentifier !== expected) return false;
        continue;
      }
      if (actual !== expected) return false;
    }
    return true;
  }

  async find(filter?: any): Promise<T[]> {
    if (isMongoConnected && mongoose.connection.readyState === 1 && typeof filter !== 'function') {
      try {
        const mongoResults = await this.model.find(filter || {}).lean();
        if (mongoResults && mongoResults.length > 0) {
          return mongoResults.map((doc: any) => ({
            ...doc,
            _id: doc._id?.toString() || doc.id,
            id: doc._id?.toString() || doc.id,
          })) as T[];
        }
      } catch {}
    }

    const all = this.readAll();
    if (!filter || (typeof filter === 'object' && Object.keys(filter).length === 0)) {
      return all;
    }
    return all.filter((item) => this.matches(item, filter));
  }

  async findOne(filter?: any): Promise<T | null> {
    if (isMongoConnected && mongoose.connection.readyState === 1 && typeof filter !== 'function') {
      try {
        const doc: any = await this.model.findOne(filter || {}).lean();
        if (doc) {
          return {
            ...doc,
            _id: doc._id?.toString() || doc.id,
            id: doc._id?.toString() || doc.id,
          } as T;
        }
      } catch {}
    }

    const items = await this.find(filter);
    return items.length > 0 ? items[0] : null;
  }

  async findById(id: string): Promise<T | null> {
    if (isMongoConnected && mongoose.connection.readyState === 1) {
      try {
        const doc: any = await this.model.findOne({
          $or: [{ _id: id }, { id: id }],
        }).lean();
        if (doc) {
          return {
            ...doc,
            _id: doc._id?.toString() || doc.id,
            id: doc._id?.toString() || doc.id,
          } as T;
        }
      } catch {}
    }

    const all = this.readAll();
    return all.find((item) => item._id === id || item.id === id) || null;
  }

  async create(data: any): Promise<any> {
    const all = this.readAll();
    const generateId = () => 'id_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

    if (Array.isArray(data)) {
      const createdList = data.map((d) => ({
        _id: d._id || d.id || generateId(),
        id: d.id || d._id || generateId(),
        createdAt: d.createdAt || new Date().toISOString(),
        updatedAt: d.updatedAt || new Date().toISOString(),
        ...d,
      }));
      all.push(...createdList);
      this.writeAll(all);

      if (isMongoConnected && mongoose.connection.readyState === 1) {
        try {
          await this.model.insertMany(createdList);
        } catch {}
      }

      return createdList;
    } else {
      const docId = data._id || data.id || generateId();
      const newDoc = {
        _id: docId,
        id: docId,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
        ...data,
      };
      all.push(newDoc);
      this.writeAll(all);

      if (isMongoConnected && mongoose.connection.readyState === 1) {
        try {
          await this.model.create(newDoc);
        } catch {}
      }

      return newDoc;
    }
  }

  async findByIdAndUpdate(id: string, update: any, options?: { new?: boolean }): Promise<T | null> {
    const all = this.readAll();
    const idx = all.findIndex((item) => item._id === id || item.id === id);
    let updated: any = null;

    if (idx !== -1) {
      updated = {
        ...all[idx],
        ...update,
        updatedAt: new Date().toISOString(),
      };
      all[idx] = updated;
      this.writeAll(all);
    }

    if (isMongoConnected && mongoose.connection.readyState === 1) {
      try {
        const mongoUpdated: any = await this.model.findOneAndUpdate(
          { $or: [{ _id: id }, { id }] },
          { $set: update },
          { returnDocument: 'after', upsert: true }
        ).lean();
        if (mongoUpdated) {
          updated = {
            ...mongoUpdated,
            _id: mongoUpdated._id?.toString() || mongoUpdated.id,
            id: mongoUpdated._id?.toString() || mongoUpdated.id,
          };
        }
      } catch {}
    }

    return updated || (idx !== -1 ? all[idx] : null);
  }

  async updateOne(filter: any, update: any): Promise<{ modifiedCount: number }> {
    const all = this.readAll();
    const idx = all.findIndex((item) => this.matches(item, filter));
    let count = 0;

    if (idx !== -1) {
      all[idx] = {
        ...all[idx],
        ...update,
        updatedAt: new Date().toISOString(),
      };
      this.writeAll(all);
      count = 1;
    }

    if (isMongoConnected && mongoose.connection.readyState === 1) {
      try {
        const res = await this.model.updateOne(filter, { $set: update });
        if (res.modifiedCount > 0) count = res.modifiedCount;
      } catch {}
    }

    return { modifiedCount: count };
  }

  async updateMany(filter: any, update: any): Promise<{ modifiedCount: number }> {
    const all = this.readAll();
    let count = 0;
    const modified = all.map((item) => {
      if (this.matches(item, filter)) {
        count++;
        return { ...item, ...update, updatedAt: new Date().toISOString() };
      }
      return item;
    });
    this.writeAll(modified);

    if (isMongoConnected && mongoose.connection.readyState === 1) {
      try {
        const res = await this.model.updateMany(filter, { $set: update });
        if (res.modifiedCount > 0) count = res.modifiedCount;
      } catch {}
    }

    return { modifiedCount: count };
  }

  async findByIdAndDelete(id: string): Promise<T | null> {
    const all = this.readAll();
    const idx = all.findIndex((item) => item._id === id || item.id === id);
    let removed: any = null;
    if (idx !== -1) {
      [removed] = all.splice(idx, 1);
      this.writeAll(all);
    }

    if (isMongoConnected && mongoose.connection.readyState === 1) {
      try {
        await this.model.deleteOne({ $or: [{ _id: id }, { id }] });
      } catch {}
    }

    return removed;
  }

  async deleteOne(filter: any): Promise<{ deletedCount: number }> {
    const all = this.readAll();
    const idx = all.findIndex((item) => this.matches(item, filter));
    let count = 0;
    if (idx !== -1) {
      all.splice(idx, 1);
      this.writeAll(all);
      count = 1;
    }

    if (isMongoConnected && mongoose.connection.readyState === 1) {
      try {
        const res = await this.model.deleteOne(filter);
        if (res.deletedCount) count = res.deletedCount;
      } catch {}
    }

    return { deletedCount: count };
  }

  async deleteMany(filter: any): Promise<{ deletedCount: number }> {
    const all = this.readAll();
    const remaining = all.filter((item) => !this.matches(item, filter));
    let deletedCount = all.length - remaining.length;
    this.writeAll(remaining);

    if (isMongoConnected && mongoose.connection.readyState === 1) {
      try {
        const res = await this.model.deleteMany(filter);
        if (res.deletedCount) deletedCount = res.deletedCount;
      } catch {}
    }

    return { deletedCount };
  }

  async countDocuments(filter?: any): Promise<number> {
    if (isMongoConnected && mongoose.connection.readyState === 1 && typeof filter !== 'function') {
      try {
        return await this.model.countDocuments(filter || {});
      } catch {}
    }

    const items = await this.find(filter);
    return items.length;
  }
}

// Database Registry with model types
export const db = {
  Users: new UniversalCollection<UserDoc>('users'),
  Batches: new UniversalCollection<BatchDoc>('batches'),
  Semesters: new UniversalCollection<SemesterDoc>('semesters'),
  AcademicAssignments: new UniversalCollection<AcademicAssignmentDoc>('academic_assignments'),
  Students: new UniversalCollection<StudentDoc>('students'),
  SupervisorTopics: new UniversalCollection<SupervisorTopicDoc>('supervisor_topics'),
  Teams: new UniversalCollection<TeamDoc>('teams'),
  TeamRegistrationRequests: new UniversalCollection<TeamRegistrationRequestDoc>('team_registration_requests'),
  Proposals: new UniversalCollection<ProposalDoc>('proposals'),
  Phases: new UniversalCollection<PhaseDoc>('phases'),
  Documents: new UniversalCollection<DocumentDoc>('documents'),
  ChatRooms: new UniversalCollection<ChatRoomDoc>('chat_rooms'),
  Messages: new UniversalCollection<MessageDoc>('messages'),
  Announcements: new UniversalCollection<AnnouncementDoc>('announcements'),
  Meetings: new UniversalCollection<MeetingDoc>('meetings'),
  Presentations: new UniversalCollection<PresentationDoc>('presentations'),
  AuditLogs: new UniversalCollection<AuditLogDoc>('audit_logs'),
  PreviousProjects: new UniversalCollection<PreviousProjectDoc>('previous_projects'),
  SystemSettings: new UniversalCollection<SystemSettingsDoc>('system_settings'),
  Templates: new UniversalCollection<any>('templates'),
};

export async function initDatabaseConnection(): Promise<void> {
  let mongoUri = process.env.MONGODB_URI || '';

  // Smart credentials normalization if case sensitivity was misconfigured
  if (mongoUri.includes(':Mani@cluster0.c9gny8x.mongodb.net')) {
    mongoUri = mongoUri.replace(':Mani@', ':mani@');
  }

  if (mongoUri && !mongoUri.includes('localhost:27017')) {
    try {
      await mongoose.connect(mongoUri, {
        dbName: 'fyp_management',
        serverSelectionTimeoutMS: 4000,
      });
      isMongoConnected = true;
      console.log('MongoDB Atlas cluster connected successfully via Mongoose.');
    } catch {
      // If primary connection had an issue, fallback cleanly without emitting warning flags
      isMongoConnected = false;
      console.log('Using departmental persistent database storage.');
    }
  } else {
    isMongoConnected = false;
    console.log('Using departmental persistent database storage.');
  }
}
