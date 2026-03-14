import React from 'react'
import { MemberSearchContainer, MemberSearchItem, NewMemberButton } from '@/modules/core/components/MemberSearch'

interface MemberSearchResultProps {
  filteredMembers: any[]
  memberSearchQuery: string
  handleSelectMember: (member: any) => void
  handleNewMember: (query: string) => void
}

export const MemberSearchResults: React.FC<MemberSearchResultProps> = ({
  filteredMembers,
  memberSearchQuery,
  handleSelectMember,
  handleNewMember
}) => {
  if (filteredMembers.length === 0 && !memberSearchQuery) return null;

  return (
    <MemberSearchContainer>
      {filteredMembers.map((member) => (
        <MemberSearchItem
          key={member.card}
          name={member.name}
          phone={member.phone}
          card={member.card}
          onClick={() => handleSelectMember(member)}
        />
      ))}
      {memberSearchQuery && !filteredMembers.some(m => m.phone === memberSearchQuery) && (
        <NewMemberButton
          query={memberSearchQuery}
          label="创建新会员"
          onClick={() => handleNewMember(memberSearchQuery)}
        />
      )}
    </MemberSearchContainer>
  );
}
