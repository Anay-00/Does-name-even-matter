import {
  createBillingService,
  createBloodBankIssue,
  createBloodBankUnit,
  createDoctorShift,
  createDoctor,
  createInsuranceClaim,
  createLabSample,
  createOtConsumable,
  createOtSchedule,
  createPharmacyInventoryItem,
  createPharmacyIssue,
  createRoomAllotment,
  dischargeRoomAllotment,
  getBillingInvoices as listBillingInvoices,
  getBillingSnapshot,
  listBloodBankIssues,
  listBloodBankUnits,
  listDoctorShifts,
  listDoctors,
  listInsuranceClaims,
  listLabSamples,
  listOtConsumables,
  listOtSchedules,
  listPharmacyInventory,
  listPharmacyIssues,
  listRoomAllotments,
  updateTaxSettings
} from "../repositories/operationsRepository.js";

export async function getDoctors(req, res, next) {
  try {
    const items = await listDoctors({
      hospitalId: req.user?.hospitalId || null,
      role: req.user?.role
    });
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function addDoctor(req, res, next) {
  try {
    const created = await createDoctor({
      hospitalId: req.user?.hospitalId || null,
      role: req.user?.role,
      payload: req.validatedBody
    });
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}

export async function getRoomAllotments(req, res, next) {
  try {
    const items = await listRoomAllotments({
      hospitalId: req.user?.hospitalId || null,
      role: req.user?.role
    });
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function addRoomAllotment(req, res, next) {
  try {
    const created = await createRoomAllotment({
      hospitalId: req.user?.hospitalId || null,
      role: req.user?.role,
      payload: req.validatedBody
    });
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}

export async function closeRoomAllotment(req, res, next) {
  try {
    const updated = await dischargeRoomAllotment({
      hospitalId: req.user?.hospitalId || null,
      role: req.user?.role,
      roomAllotmentId: req.params.id,
      billAmount: req.validatedBody.billAmount,
      notes: req.validatedBody.notes
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

export async function getBilling(req, res, next) {
  try {
    const snapshot = await getBillingSnapshot({
      hospitalId: req.user?.hospitalId || null,
      role: req.user?.role
    });
    res.json(snapshot);
  } catch (error) {
    next(error);
  }
}

export async function getBillingInvoices(req, res, next) {
  try {
    const items = await listBillingInvoices({
      hospitalId: req.user?.hospitalId || null,
      role: req.user?.role
    });
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function addBillingService(req, res, next) {
  try {
    const created = await createBillingService({
      hospitalId: req.user?.hospitalId || null,
      role: req.user?.role,
      payload: req.validatedBody
    });
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}

export async function updateBillingTax(req, res, next) {
  try {
    const updated = await updateTaxSettings({
      hospitalId: req.user?.hospitalId || null,
      role: req.user?.role,
      taxPercentage: req.validatedBody.taxPercentage
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

export async function getBloodBankUnits(req, res, next) {
  try {
    const items = await listBloodBankUnits({ hospitalId: req.user?.hospitalId || null, role: req.user?.role });
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function addBloodBankUnit(req, res, next) {
  try {
    const created = await createBloodBankUnit({ hospitalId: req.user?.hospitalId || null, role: req.user?.role, payload: req.validatedBody });
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}

export async function getBloodBankIssues(req, res, next) {
  try {
    const items = await listBloodBankIssues({ hospitalId: req.user?.hospitalId || null, role: req.user?.role });
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function addBloodBankIssue(req, res, next) {
  try {
    const created = await createBloodBankIssue({ hospitalId: req.user?.hospitalId || null, role: req.user?.role, payload: req.validatedBody });
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}

export async function getDoctorShifts(req, res, next) {
  try {
    const items = await listDoctorShifts({ hospitalId: req.user?.hospitalId || null, role: req.user?.role });
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function addDoctorShift(req, res, next) {
  try {
    const created = await createDoctorShift({ hospitalId: req.user?.hospitalId || null, role: req.user?.role, payload: req.validatedBody });
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}

export async function getLabSamples(req, res, next) {
  try {
    const items = await listLabSamples({ hospitalId: req.user?.hospitalId || null, role: req.user?.role });
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function addLabSample(req, res, next) {
  try {
    const created = await createLabSample({ hospitalId: req.user?.hospitalId || null, role: req.user?.role, payload: req.validatedBody });
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}

export async function getOtSchedules(req, res, next) {
  try {
    const items = await listOtSchedules({ hospitalId: req.user?.hospitalId || null, role: req.user?.role });
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function addOtSchedule(req, res, next) {
  try {
    const created = await createOtSchedule({ hospitalId: req.user?.hospitalId || null, role: req.user?.role, payload: req.validatedBody });
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}

export async function getOtConsumables(req, res, next) {
  try {
    const items = await listOtConsumables({ hospitalId: req.user?.hospitalId || null, role: req.user?.role });
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function addOtConsumable(req, res, next) {
  try {
    const created = await createOtConsumable({ hospitalId: req.user?.hospitalId || null, role: req.user?.role, payload: req.validatedBody });
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}

export async function getPharmacyInventory(req, res, next) {
  try {
    const items = await listPharmacyInventory({ hospitalId: req.user?.hospitalId || null, role: req.user?.role });
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function addPharmacyInventory(req, res, next) {
  try {
    const created = await createPharmacyInventoryItem({ hospitalId: req.user?.hospitalId || null, role: req.user?.role, payload: req.validatedBody });
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}

export async function getPharmacyIssues(req, res, next) {
  try {
    const items = await listPharmacyIssues({ hospitalId: req.user?.hospitalId || null, role: req.user?.role });
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function addPharmacyIssue(req, res, next) {
  try {
    const created = await createPharmacyIssue({ hospitalId: req.user?.hospitalId || null, role: req.user?.role, payload: req.validatedBody });
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}

export async function getInsuranceClaims(req, res, next) {
  try {
    const items = await listInsuranceClaims({ hospitalId: req.user?.hospitalId || null, role: req.user?.role });
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function addInsuranceClaim(req, res, next) {
  try {
    const created = await createInsuranceClaim({ hospitalId: req.user?.hospitalId || null, role: req.user?.role, payload: req.validatedBody });
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}
