import {
  approveHospitalOnboarding,
  listAmbulanceProviders,
  listAmbulancesByCity,
  listHospitalsForAdmin,
  onboardAmbulanceProvider,
  onboardHospital
} from "../repositories/networkRepository.js";

export async function listHospitals(req, res, next) {
  try {
    const city = typeof req.query.city === "string" ? req.query.city : undefined;
    const items = await listHospitalsForAdmin(city);
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function createHospital(req, res, next) {
  try {
    const created = await onboardHospital({
      cityName: req.validatedBody.city,
      code: req.validatedBody.code,
      name: req.validatedBody.name,
      address: req.validatedBody.address,
      landmark: req.validatedBody.landmark,
      latitude: req.validatedBody.latitude,
      longitude: req.validatedBody.longitude
    });
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}

export async function approveHospital(req, res, next) {
  try {
    const approved = await approveHospitalOnboarding(req.params.id);
    res.json(approved);
  } catch (error) {
    next(error);
  }
}

export async function listProviders(req, res, next) {
  try {
    const city = typeof req.query.city === "string" ? req.query.city : undefined;
    const items = await listAmbulanceProviders(city);
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function createProvider(req, res, next) {
  try {
    const created = await onboardAmbulanceProvider({
      cityName: req.validatedBody.city,
      name: req.validatedBody.name
    });
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}

export async function getCityOverview(req, res, next) {
  try {
    const city = typeof req.query.city === "string" ? req.query.city : undefined;
    const [hospitals, providers, ambulances] = await Promise.all([
      listHospitalsForAdmin(city),
      listAmbulanceProviders(city),
      listAmbulancesByCity(city)
    ]);

    const totals = {
      hospitals: hospitals.length,
      activeHospitals: hospitals.filter((item) => item.isActive).length,
      providers: providers.length,
      ambulances: ambulances.length,
      ambulancesDispatched: ambulances.filter((item) => item.tripStatus === "dispatched").length
    };

    res.json({ city: city || "Indore", totals, hospitals, providers, ambulances });
  } catch (error) {
    next(error);
  }
}
