import React from 'react';
import { User } from '../../types';
import { useKYCVerification } from '../../hooks/kyc/useKYCVerification';
import { KYCAdminBacklog } from './KYCAdminBacklog';
import { KYCUserSubmission } from './KYCUserSubmission';

export interface KYCVerificationProps {
  user: User;
  isAdminMode?: boolean; // When true, provides the admin verification panel
  onVerificationUpdated?: () => void;
}

export default function KYCVerification({ user, isAdminMode = false, onVerificationUpdated }: KYCVerificationProps) {
  const {
    documents,
    backlog,
    loading,
    docType,
    setDocType,
    docNumber,
    setDocNumber,
    fileUrl,
    setFileUrl,
    fullLegalName,
    setFullLegalName,
    kraPin,
    setKraPin,
    dateOfBirth,
    setDateOfBirth,
    countyOfOperation,
    setCountyOfOperation,
    setFileBase64,
    fileName,
    setFileName,
    testSuiteSelection,
    setTestSuiteSelection,
    isSubmitting,
    userError,
    setUserError,
    userSuccess,
    selectedDoc,
    setSelectedDoc,
    rejectionReason,
    setRejectionReason,
    isReviewing,
    adminError,
    setAdminError,
    adminSuccess,
    handleUserSubmit,
    handleAdminReview
  } = useKYCVerification({ user, isAdminMode, onVerificationUpdated });

  if (isAdminMode) {
    return (
      <KYCAdminBacklog
        backlog={backlog}
        loading={loading}
        selectedDoc={selectedDoc}
        setSelectedDoc={setSelectedDoc}
        rejectionReason={rejectionReason}
        setRejectionReason={setRejectionReason}
        isReviewing={isReviewing}
        adminError={adminError}
        setAdminError={setAdminError}
        adminSuccess={adminSuccess}
        handleAdminReview={handleAdminReview}
      />
    );
  }

  return (
    <KYCUserSubmission
      documents={documents}
      docType={docType}
      setDocType={setDocType}
      docNumber={docNumber}
      setDocNumber={setDocNumber}
      fileUrl={fileUrl}
      setFileUrl={setFileUrl}
      fullLegalName={fullLegalName}
      setFullLegalName={setFullLegalName}
      kraPin={kraPin}
      setKraPin={setKraPin}
      dateOfBirth={dateOfBirth}
      setDateOfBirth={setDateOfBirth}
      countyOfOperation={countyOfOperation}
      setCountyOfOperation={setCountyOfOperation}
      setFileBase64={setFileBase64}
      fileName={fileName}
      setFileName={setFileName}
      testSuiteSelection={testSuiteSelection}
      setTestSuiteSelection={setTestSuiteSelection}
      isSubmitting={isSubmitting}
      userError={userError}
      setUserError={setUserError}
      userSuccess={userSuccess}
      handleUserSubmit={handleUserSubmit}
    />
  );
}
