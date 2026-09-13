import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as categoryService from './service_category';
import { successResponse, paginatedResponse } from '../../utils/response';
import { clearCache } from '../../middleware/responseCache';

export class CategoryController {
  list = async (req: Request, res: Response) => {
    try {
      const { isShared, isDisabled, ownerId } = req.query;
      const categories = await categoryService.listCategories({
        isShared: isShared ? isShared === 'true' : undefined,
        isDisabled: isDisabled ? isDisabled === 'true' : undefined,
        ownerId: ownerId as string,
      });
      res.json(successResponse(categories));
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  };

  // Non-admin: list only the current user's own personal categories
  personalList = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
      const categories = await categoryService.listCategories({ ownerId: req.user.id, isDisabled: undefined });
      res.json(successResponse(categories));
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  };

  // Non-admin: create personal category (isShared = false by default)
  createPersonal = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
      const { name, description } = req.body;
      const category = await categoryService.createCategory(
        { name, description, isShared: false },
        req.user.id,
      );
      res.status(201).json(successResponse(category, 'Category created'));
    } catch (error: any) {
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  };

  // Non-admin: update own personal category (cannot change isShared)
  updatePersonal = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
      const category = await categoryService.getCategoryById(String(req.params.id));
      if (!category || category.ownerId !== req.user.id) {
        return res.status(403).json({ success: false, error: { message: 'Not your category' } });
      }
      const { name, description, isDisabled } = req.body;
      const updated = await categoryService.updateCategory(String(req.params.id), { name, description, isDisabled });
      res.json(successResponse(updated, 'Category updated'));
    } catch (error: any) {
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  };

  // Non-admin: soft-delete own personal category (sets isDisabled = true)
  removePersonal = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
      const category = await categoryService.getCategoryById(String(req.params.id));
      if (!category || category.ownerId !== req.user.id) {
        return res.status(403).json({ success: false, error: { message: 'Not your category' } });
      }
      await categoryService.disablePersonalCategory(String(req.params.id));
      res.json(successResponse(null, 'Category deleted'));
    } catch (error: any) {
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  };

  // Non-admin: toggle disabled on own personal category
  togglePersonal = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
      const category = await categoryService.getCategoryById(String(req.params.id));
      if (!category || category.ownerId !== req.user.id) {
        return res.status(403).json({ success: false, error: { message: 'Not your category' } });
      }
      const updated = await categoryService.toggleCategoryDisabled(String(req.params.id));
      res.json(successResponse(updated, 'Category toggled'));
    } catch (error: any) {
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  };

  shared = async (req: Request, res: Response) => {
    try {
      const categories = await categoryService.getSharedCategories();
      res.json(successResponse(categories));
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const category = await categoryService.getCategoryById(String(req.params.id));
      if (!category) {
        return res.status(404).json({ success: false, error: { message: 'Category not found' } });
      }
      res.json(successResponse(category));
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  };

  create = async (req: AuthRequest, res: Response) => {
    try {
      const { name, description, isShared } = req.body;
      if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
      const category = await categoryService.createCategory(
        { name, description, isShared },
        req.user.id,
      );
      clearCache('^/categories');
      res.status(201).json(successResponse(category, 'Category created'));
    } catch (error: any) {
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  };

  update = async (req: AuthRequest, res: Response) => {
    try {
      const { name, description, isShared, isDisabled } = req.body;
      const category = await categoryService.updateCategory(String(req.params.id), {
        name,
        description,
        isShared,
        isDisabled,
      });
      clearCache('^/categories');
      res.json(successResponse(category, 'Category updated'));
    } catch (error: any) {
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  };

  remove = async (req: AuthRequest, res: Response) => {
    try {
      await categoryService.deleteCategory(String(req.params.id));
      clearCache('^/categories');
      res.json(successResponse(null, 'Category deleted'));
    } catch (error: any) {
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  };

  toggle = async (req: AuthRequest, res: Response) => {
    try {
      const category = await categoryService.toggleCategoryDisabled(String(req.params.id));
      clearCache('^/categories');
      res.json(successResponse(category, 'Category toggled'));
    } catch (error: any) {
      res.status(400).json({ success: false, error: { message: error.message } });
    }
  };

  seedDefaults = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
      const created = await categoryService.seedDefaultCategories(req.user.id);
      clearCache('^/categories');
      res.json(successResponse({ count: created.length }, 'Default categories seeded'));
    } catch (error: any) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  };
}
