import { Request, Response } from 'express';
import { Member } from '../entity/Member';
import { Bug } from '../entity/Bug';
import { createBugValidator } from '../utils/validators';

export const createBug = async (req: Request, res: Response) => {
  const { title, description, priority } = req.body;
  const { projectId } = req.params;

  const { errors, valid } = createBugValidator(title, description, priority);

  if (!valid) {
    return res.status(400).send({ message: Object.values(errors)[0] });
  }

  const projectMembers = await Member.find({ projectId });
  const memberIds = projectMembers.map((m) => m.memberId);

  if (!memberIds.includes(req.user)) {
    return res.status(401).send({ message: 'Access is denied.' });
  }

  const newBug = Bug.create({
    title,
    description,
    priority,
    projectId,
    createdById: req.user,
  });

  await newBug.save();
  return res.status(201).json(newBug);
};

export const updateBug = async (req: Request, res: Response) => {
  const { title, description, priority } = req.body;
  const { projectId, bugId } = req.params;

  const { errors, valid } = createBugValidator(title, description, priority);

  if (!valid) {
    return res.status(400).send({ message: Object.values(errors)[0] });
  }

  const projectMembers = await Member.find({ projectId });
  const memberIds = projectMembers.map((m) => m.memberId);

  if (!memberIds.includes(req.user)) {
    return res.status(401).send({ message: 'Access is denied.' });
  }

  const updatedBug = await Bug.createQueryBuilder('bug')
    .update(Bug)
    .set({
      title,
      description,
      priority,
      updatedById: req.user,
      updatedAt: new Date(),
    })
    .where('id = :bugId', { bugId })
    .returning('*')
    .updateEntity(true)
    .execute()
    .then((res) => res.raw[0]);

  return res.json(updatedBug);
};

export const closeBug = async (req: Request, res: Response) => {
  const { projectId, bugId } = req.params;

  const projectMembers = await Member.find({ projectId });
  const memberIds = projectMembers.map((m) => m.memberId);

  if (!memberIds.includes(req.user)) {
    return res.status(401).send({ message: 'Access is denied.' });
  }

  const targetBug = await Bug.findOne({ id: bugId });

  if (!targetBug) {
    return res.status(400).send({ message: 'Invalid bug ID.' });
  }

  if (targetBug.isResolved === true) {
    return res
      .status(400)
      .send({ message: 'Bug is already marked as closed.' });
  }

  targetBug.isResolved = true;
  targetBug.closedById = req.user;
  targetBug.closedAt = new Date();
  targetBug.reopenedById = undefined;
  targetBug.reopenedAt = undefined;

  await targetBug.save();
  res.status(201).json(targetBug);
};

export const reopenBug = async (req: Request, res: Response) => {
  const { projectId, bugId } = req.params;

  const projectMembers = await Member.find({ projectId });
  const memberIds = projectMembers.map((m) => m.memberId);

  if (!memberIds.includes(req.user)) {
    return res.status(401).send({ message: 'Access is denied.' });
  }

  const targetBug = await Bug.findOne({ id: bugId });

  if (!targetBug) {
    return res.status(400).send({ message: 'Invalid bug ID.' });
  }

  if (targetBug.isResolved === false) {
    return res
      .status(400)
      .send({ message: 'Bug is already marked as opened.' });
  }

  targetBug.isResolved = false;
  targetBug.reopenedById = req.user;
  targetBug.reopenedAt = new Date();
  targetBug.closedById = undefined;
  targetBug.closedAt = undefined;

  await targetBug.save();
  res.status(201).json(targetBug);
};