const path = require('path');
const express = require('express');
const requireSupabaseUser = require('../middleware/requireSupabaseUser');
const {
  embedText,
  getEmbeddingInfo,
} = require('../../source/rag/embed');
const { getFamilyMemoriesTable } = require('../../source/rag/search');
const { runQueryOrchestrator } = require('../../source/agents/orchestrator');

const router = express.Router();
const MAX_CONTENT_LENGTH = 12000;

function apiFailure(res, status, message) {
  return res.status(status).json({
    success: false,
    data: null,
    message,
  });
}

function apiSuccess(res, status, data, message) {
  return res.status(status).json({
    success: true,
    data,
    message,
  });
}

function sendSupabaseError(res, error, action) {
  console.error(action, {
    code: error.code || null,
    status: error.status || null,
  });

  if (error.status === 401) {
    return apiFailure(res, 401, 'Your sign-in session is invalid or expired.');
  }
  if (error.code === '42501' || error.status === 403) {
    return apiFailure(res, 403, 'An active family membership is required.');
  }
  return apiFailure(res, 502, 'The family memory service could not complete the request.');
}

function parseContent(value) {
  return typeof value === 'string'
    && value.trim().length > 0
    && value.length <= MAX_CONTENT_LENGTH;
}

router.get(['/api/memories', '/api/memories/history'], requireSupabaseUser, async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from(getFamilyMemoriesTable())
      .select('id, content, source_file, created_by, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return sendSupabaseError(res, error, 'Could not load family memory history:');
    }
    if (!Array.isArray(data)) {
      return apiFailure(res, 502, 'The family memory service returned an invalid history response.');
    }
    const memories = data.map((memory) => ({
      ...memory,
      source_file_name: memory.source_file_name || memory.source_file || null,
    }));
    return apiSuccess(res, 200, memories, 'Family memory history loaded.');
  } catch (error) {
    console.error('Family memory history request failed:', error);
    return apiFailure(res, 500, 'Could not load family memory history.');
  }
});

router.post('/api/memories/search', requireSupabaseUser, async (req, res) => {
  try {
    const query = req.body?.query;
    if (!parseContent(query)) {
      return apiFailure(
        res,
        400,
        `Enter a search query of no more than ${MAX_CONTENT_LENGTH} characters.`,
      );
    }

    const { data: membership, error: membershipError } = await req.supabase
      .from('family_members')
      .select('family_id, status, role')
      .eq('profile_id', req.user.id)
      .eq('status', 'active')
      .not('role', 'is', null)
      .maybeSingle();
    if (membershipError) {
      return sendSupabaseError(res, membershipError, 'Could not load active family membership:');
    }
    if (!membership) {
      return apiFailure(res, 403, 'An active family membership is required.');
    }

    const result = await runQueryOrchestrator(query.trim(), {
      familyId: membership.family_id,
      profileId: req.user.id,
      supabaseClient: req.supabase,
    });
    const embeddingInfo = getEmbeddingInfo();
    console.info('Family memory search completed:', {
      modelPath: embeddingInfo.modelPath,
      metric: 'cosine',
      source_file: result.memories.map((memory) => memory.source_file).filter(Boolean),
    });
    const responseData = {
      ...result,
      citations: result.final.citations || result.editor?.citations || result.analyst?.citations || [],
      matches: result.memories,
      embedding: embeddingInfo,
    };
    return apiSuccess(res, 200, {
      ...responseData,
    }, 'Family memories searched.');
  } catch (error) {
    console.error('Family memory search request failed:', error);
    if (error instanceof TypeError || error instanceof RangeError) {
      return apiFailure(res, 400, error.message);
    }
    if (error.code || error.status) {
      return sendSupabaseError(res, error, 'Could not search family memories:');
    }
    return apiFailure(res, 500, 'Could not search family memories.');
  }
});

router.post(['/api/memories', '/api/memories/save'], requireSupabaseUser, async (req, res) => {
  try {
    const { content, sourceFile } = req.body || {};
    if (!parseContent(content)) {
      return apiFailure(
        res,
        400,
        `Memory content must be non-empty and no more than ${MAX_CONTENT_LENGTH} characters.`,
      );
    }
    if (sourceFile !== undefined && sourceFile !== null && typeof sourceFile !== 'string') {
      return apiFailure(res, 400, 'The source file name must be text.');
    }

    const safeSourceFile = sourceFile
      ? path.basename(sourceFile.replace(/\\/g, '/')).slice(0, 255)
      : null;
    const embedding = await embedText(content);
    const vector = `[${embedding.join(',')}]`;
    const memoryInsert = {
      content: content.trim(),
      embedding: embedding.length === 384 ? vector : null,
      source_file_name: safeSourceFile,
      source_file: safeSourceFile,
      created_by: req.user.id,
    };
    if (embedding.length === 512) {
      memoryInsert.embedding_bge = vector;
    }
    const { data, error } = await req.supabase
      .from(getFamilyMemoriesTable())
      .insert({
        ...memoryInsert,
      })
      .select('id, content, source_file, created_by, created_at')
      .single();

    if (error) {
      return sendSupabaseError(res, error, 'Could not save family memory:');
    }
    const embeddingInfo = getEmbeddingInfo();
    console.info('Family memory saved:', {
      modelPath: embeddingInfo.modelPath,
      metric: 'cosine',
      source_file_name: data.source_file,
    });
    return apiSuccess(res, 201, {
      ...data,
      source_file_name: data.source_file,
      embedding: embeddingInfo,
    }, 'Family memory saved.');
  } catch (error) {
    console.error('Family memory save request failed:', error);
    if (error instanceof TypeError) {
      return apiFailure(res, 400, error.message);
    }
    return apiFailure(res, 500, 'Could not save family memory.');
  }
});

module.exports = router;
