import { CONTRACT_STATUSES, type ContractStatus } from './contract.types';
import { createContract, deleteContract, getContractById, listContracts, updateContract } from './contract.repository';
import { validateCreateContract, validateUpdateContract } from './contract.validation';

export async function getContractList(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20));
  const requestedStatus = searchParams.get('status');
  const status = requestedStatus && CONTRACT_STATUSES.includes(requestedStatus as ContractStatus) ? (requestedStatus as ContractStatus) : undefined;
  return listContracts({ page, limit, status });
}

export async function getContract(id: string) {
  return getContractById(id);
}

export async function addContract(payload: unknown) {
  return createContract(validateCreateContract(payload));
}

export async function editContract(id: string, payload: unknown) {
  return updateContract(id, validateUpdateContract(payload));
}

export async function removeContract(id: string) {
  return deleteContract(id);
}
